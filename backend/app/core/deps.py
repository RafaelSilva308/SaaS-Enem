from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.engine import get_session
from app.services.auth_service import get_current_user as _get_current_user
from app.models.models import Subscription, User

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação ausente",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await _get_current_user(credentials.credentials, session)


async def get_current_active_user(
    user: User = Depends(get_current_user),
) -> User:
    if user.account_status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conta suspensa")
    return user


async def get_current_admin(
    user: User = Depends(get_current_active_user),
) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores.")
    return user


async def get_premium_user(
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> User:
    r = await session.exec(
        select(Subscription)
        .where(Subscription.user_id == user.id)
        .where(Subscription.status == "active")
        .where(Subscription.plan_type != "free")
        .where(Subscription.end_date > datetime.now(timezone.utc).replace(tzinfo=None))
        .limit(1)
    )
    if not r.first():
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Esta funcionalidade requer uma assinatura premium.",
        )
    return user
