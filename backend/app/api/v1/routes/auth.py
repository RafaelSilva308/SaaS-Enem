from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.db.engine import get_session
from app.models.models import User
from app.schemas.auth import (
    AuthResponse,
    Enable2FAResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
    Verify2FARequest,
    VerifyEmailRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer()


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, session: AsyncSession = Depends(get_session)):
    return await auth_service.register(data, session)


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(data: VerifyEmailRequest, session: AsyncSession = Depends(get_session)):
    return await auth_service.verify_email(data, session)


@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    client_ip = request.client.host if request.client else "unknown"
    return await auth_service.login(data, client_ip, session)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, session: AsyncSession = Depends(get_session)):
    return await auth_service.refresh_tokens(data.refresh_token, session)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_session),
):
    return await auth_service.forgot_password(data.email, session)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(data: ResetPasswordRequest, session: AsyncSession = Depends(get_session)):
    return await auth_service.reset_password(data.token, data.new_password, session)


@router.post("/2fa/enable", response_model=Enable2FAResponse)
async def enable_2fa(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    session: AsyncSession = Depends(get_session),
):
    user = await auth_service.get_current_user(credentials.credentials, session)
    return await auth_service.enable_2fa(str(user.id), session)


@router.post("/2fa/verify", response_model=MessageResponse)
async def verify_2fa(
    data: Verify2FARequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    session: AsyncSession = Depends(get_session),
):
    user = await auth_service.get_current_user(credentials.credentials, session)
    return await auth_service.verify_2fa_setup(str(user.id), data.totp_code, session)


@router.get("/me", response_model=UserResponse)
async def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    session: AsyncSession = Depends(get_session),
):
    user = await auth_service.get_current_user(credentials.credentials, session)
    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        email_verified=user.email_verified,
        role=user.role,
        has_2fa=bool(user.totp_secret),
    )


@router.post("/resend-otp", response_model=MessageResponse)
async def resend_otp(data: VerifyEmailRequest, session: AsyncSession = Depends(get_session)):
    """Reenvia o OTP de verificação de e-mail."""
    from app.core.security import generate_otp
    from app.core.redis import get_redis
    redis = await get_redis()
    otp = generate_otp()
    await redis.setex(f"otp:{data.email}", 600, otp)
    await auth_service._send_email(
        to=data.email,
        subject="Novo código de verificação — SaaS ENEM",
        html=f"<p>Seu novo código é: <strong>{otp}</strong></p><p>Válido por 10 minutos.</p>",
    )
    return MessageResponse(message="Novo código enviado.")


# ── LGPD endpoints ────────────────────────────────────────────────

@router.delete("/me", response_model=MessageResponse)
async def delete_account(
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await auth_service.delete_account(str(user.id), session)


@router.get("/me/export")
async def export_my_data(
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    data = await auth_service.export_user_data(str(user.id), session)
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f"attachment; filename=meus-dados-enem-pro.json"},
    )
