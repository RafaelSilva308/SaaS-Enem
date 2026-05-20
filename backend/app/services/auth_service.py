import html
import json
import uuid
from datetime import timedelta

import pyotp
import resend
from fastapi import HTTPException, status
from jose import JWTError
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.redis import get_redis
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    generate_otp,
    generate_reset_token,
    hash_password,
    verify_password,
)
from app.models.models import utcnow
from app.models.models import User
from app.schemas.auth import (
    AuthResponse,
    Enable2FAResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
)

resend.api_key = settings.RESEND_API_KEY

REFRESH_TTL = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400  # seconds
OTP_TTL = 600          # 10 minutos
RESET_TTL = 3600       # 1 hora
RATE_LIMIT_TTL = 900   # 15 minutos
MAX_LOGIN_ATTEMPTS = 5


# ── helpers ──────────────────────────────────────────────────────

def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        email_verified=user.email_verified,
        role=user.role,
        has_2fa=bool(user.totp_secret),
    )


async def _get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.exec(select(User).where(User.email == email))
    return result.first()


async def _send_email(to: str, subject: str, html: str) -> None:
    if not settings.RESEND_API_KEY or settings.APP_ENV == "development":
        print(f"[EMAIL DEV] To: {to} | Subject: {subject}")
        return
    resend.Emails.send({
        "from": settings.EMAIL_FROM,
        "to": [to],
        "subject": subject,
        "html": html,
    })


# ── register ─────────────────────────────────────────────────────

async def register(data: RegisterRequest, session: AsyncSession) -> MessageResponse:
    existing = await _get_user_by_email(session, data.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado")

    user = User(
        id=uuid.uuid4(),
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        date_of_birth=data.date_of_birth,
    )
    session.add(user)
    await session.commit()

    otp = generate_otp()
    redis = await get_redis()
    await redis.setex(f"otp:{data.email}", OTP_TTL, otp)

    await _send_email(
        to=data.email,
        subject="Confirme seu e-mail — SaaS ENEM",
        html=f"<p>Olá {data.name},</p><p>Seu código de verificação é: <strong>{otp}</strong></p><p>Válido por 10 minutos.</p>",
    )

    return MessageResponse(message="Cadastro realizado. Verifique seu e-mail para ativar a conta.")


# ── verify email ─────────────────────────────────────────────────

async def verify_email(data: VerifyEmailRequest, session: AsyncSession) -> MessageResponse:
    redis = await get_redis()
    stored_otp = await redis.get(f"otp:{data.email}")

    if not stored_otp or stored_otp != data.otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código inválido ou expirado")

    user = await _get_user_by_email(session, data.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    user.email_verified = True
    session.add(user)
    await session.commit()
    await redis.delete(f"otp:{data.email}")

    return MessageResponse(message="E-mail verificado com sucesso!")


# ── login ─────────────────────────────────────────────────────────

async def login(data: LoginRequest, client_ip: str, session: AsyncSession) -> AuthResponse:
    redis = await get_redis()
    rate_key = f"login_attempts:{client_ip}"
    attempts = await redis.get(rate_key)

    if attempts and int(attempts) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Aguarde 15 minutos.",
        )

    user = await _get_user_by_email(session, data.email)

    if not user or not verify_password(data.password, user.password_hash):
        pipe = redis.pipeline()
        pipe.incr(rate_key)
        pipe.expire(rate_key, RATE_LIMIT_TTL)
        await pipe.execute()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    if not user.email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="E-mail não verificado")

    if user.account_status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conta suspensa")

    if user.totp_secret:
        if not data.totp_code:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Código 2FA obrigatório")
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(data.totp_code, valid_window=1):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Código 2FA inválido")

    await redis.delete(rate_key)

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token()
    await redis.setex(f"refresh:{refresh_token}", REFRESH_TTL, str(user.id))

    return AuthResponse(
        tokens=TokenResponse(access_token=access_token, refresh_token=refresh_token),
        user=_user_response(user),
    )


# ── refresh ───────────────────────────────────────────────────────

async def refresh_tokens(refresh_token: str, session: AsyncSession) -> TokenResponse:
    redis = await get_redis()
    user_id = await redis.get(f"refresh:{refresh_token}")

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")

    await redis.delete(f"refresh:{refresh_token}")

    new_access = create_access_token(user_id)
    new_refresh = create_refresh_token()
    await redis.setex(f"refresh:{new_refresh}", REFRESH_TTL, user_id)

    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


# ── forgot / reset password ───────────────────────────────────────

async def forgot_password(email: str, session: AsyncSession) -> MessageResponse:
    user = await _get_user_by_email(session, email)
    # Não revelar se o e-mail existe ou não
    if user:
        token = generate_reset_token()
        redis = await get_redis()
        await redis.setex(f"pwd_reset:{token}", RESET_TTL, str(user.id))
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        await _send_email(
            to=email,
            subject="Redefinição de senha — SaaS ENEM",
            html=f"<p>Clique no link para redefinir sua senha:</p><a href='{reset_url}'>{reset_url}</a><p>Válido por 1 hora.</p>",
        )
    return MessageResponse(message="Se o e-mail estiver cadastrado, você receberá as instruções.")


async def reset_password(token: str, new_password: str, session: AsyncSession) -> MessageResponse:
    redis = await get_redis()
    user_id = await redis.get(f"pwd_reset:{token}")

    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido ou expirado")

    result = await session.exec(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    user.password_hash = hash_password(new_password)
    session.add(user)
    await session.commit()
    await redis.delete(f"pwd_reset:{token}")

    return MessageResponse(message="Senha redefinida com sucesso!")


# ── 2FA ───────────────────────────────────────────────────────────

async def enable_2fa(user_id: str, session: AsyncSession) -> Enable2FAResponse:
    result = await session.exec(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user.email, issuer_name="SaaS ENEM")

    # Armazena provisoriamente até confirmação
    redis = await get_redis()
    await redis.setex(f"2fa_setup:{user_id}", 600, secret)

    return Enable2FAResponse(totp_uri=uri, secret=secret)


async def verify_2fa_setup(user_id: str, totp_code: str, session: AsyncSession) -> MessageResponse:
    redis = await get_redis()
    secret = await redis.get(f"2fa_setup:{user_id}")

    if not secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sessão de configuração expirada")

    totp = pyotp.TOTP(secret)
    if not totp.verify(totp_code, valid_window=1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código 2FA inválido")

    result = await session.exec(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.first()
    user.totp_secret = secret
    session.add(user)
    await session.commit()
    await redis.delete(f"2fa_setup:{user_id}")

    return MessageResponse(message="Autenticação de dois fatores ativada!")


# ── get_current_user dependency ───────────────────────────────────

async def get_current_user(token: str, session: AsyncSession) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await session.exec(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.first()
    if not user or user.account_status != "active":
        raise credentials_exception
    return user


# ── LGPD: account deletion ────────────────────────────────────────

async def delete_account(user_id: str, session: AsyncSession) -> MessageResponse:
    """
    Exclui a conta do usuário em conformidade com a LGPD:
    - Anonimiza PII (nome, e-mail, telefone)
    - Soft-delete (preserved_at)
    - Cancela assinaturas ativas
    - Limpa tokens Redis
    """
    from app.models.models import Subscription

    uid = uuid.UUID(user_id)
    r = await session.exec(select(User).where(User.id == uid))
    user = r.first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    anon_suffix = str(uid)[:8]
    user.email = f"deleted_{anon_suffix}@deleted.invalid"
    user.name = "Conta excluída"
    user.phone = None
    user.profile_picture_url = None
    user.totp_secret = None
    user.password_hash = ""
    user.deleted_at = __import__("app.models.models", fromlist=["utcnow"]).utcnow()
    user.account_status = "deleted"
    session.add(user)

    # Cancel active subscriptions
    subs_r = await session.exec(
        select(Subscription)
        .where(Subscription.user_id == uid)
        .where(Subscription.status == "active")
    )
    for sub in subs_r.all():
        sub.status = "cancelled"
        session.add(sub)

    await session.commit()

    # Clear Redis tokens + push subscription
    redis = await get_redis()
    await redis.delete(f"refresh:{uid}", f"push_sub:{uid}", f"dashboard:{uid}")

    return MessageResponse(message="Conta excluída com sucesso. Sentiremos sua falta.")


# ── LGPD: data export ─────────────────────────────────────────────

async def export_user_data(user_id: str, session: AsyncSession) -> dict:
    """Exporta todos os dados do usuário em formato JSON (direito de portabilidade LGPD)."""
    from app.models.models import (
        Essay, EssayAnalysis, ExamResult, LearningProfile,
        Subscription, Topic, UserPoint, UserStreak,
    )

    uid = uuid.UUID(user_id)

    u_r = await session.exec(select(User).where(User.id == uid))
    user = u_r.first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    lp_r = await session.exec(select(LearningProfile).where(LearningProfile.user_id == uid))
    lp = lp_r.first()

    pts_r = await session.exec(select(UserPoint).where(UserPoint.user_id == uid))
    pts = pts_r.first()

    streak_r = await session.exec(select(UserStreak).where(UserStreak.user_id == uid))
    streak = streak_r.first()

    subs_r = await session.exec(select(Subscription).where(Subscription.user_id == uid).order_by(Subscription.created_at.desc()))  # type: ignore
    subs = subs_r.all()

    exams_r = await session.exec(
        select(ExamResult).where(ExamResult.user_id == uid)
        .order_by(ExamResult.completed_at.desc()).limit(50)  # type: ignore
    )
    exams = exams_r.all()

    essays_r = await session.exec(
        select(Essay).where(Essay.user_id == uid)
        .order_by(Essay.created_at.desc()).limit(50)  # type: ignore
    )
    essays = essays_r.all()

    return {
        "exported_at": __import__("datetime").datetime.utcnow().isoformat(),
        "user": {
            "id": str(user.id), "name": user.name, "email": user.email,
            "date_of_birth": str(user.date_of_birth), "role": user.role,
            "created_at": user.created_at.isoformat(),
        },
        "learning_profile": {
            "learning_style": lp.learning_style if lp else None,
            "preferred_time": lp.preferred_time if lp else None,
            "daily_hours_goal": str(lp.daily_hours_goal) if lp else None,
            "available_days": lp.available_days if lp else None,
        } if lp else None,
        "gamification": {
            "total_points": pts.total_points if pts else 0,
            "level": pts.current_level if pts else 1,
            "experience_points": pts.experience_points if pts else 0,
            "current_streak": streak.current_streak if streak else 0,
            "longest_streak": streak.longest_streak if streak else 0,
        },
        "subscriptions": [
            {
                "plan_type": s.plan_type, "status": s.status,
                "start_date": s.start_date.isoformat(), "end_date": s.end_date.isoformat(),
                "amount_paid": str(s.amount_paid or "0"),
            }
            for s in subs
        ],
        "exam_results": [
            {
                "completed_at": e.completed_at.isoformat(),
                "total_questions": e.total_questions, "correct": e.correct_answers,
                "score_estimate": e.score_estimate,
            }
            for e in exams
        ],
        "essays": [
            {
                "theme": e.theme_title, "status": e.status,
                "word_count": e.word_count, "submitted_at": e.submitted_at.isoformat() if e.submitted_at else None,
            }
            for e in essays
        ],
    }
