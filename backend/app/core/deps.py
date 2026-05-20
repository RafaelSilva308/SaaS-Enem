from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.engine import get_session
from app.services.auth_service import get_current_user as _get_current_user
from app.models.models import User

bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    return await _get_current_user(credentials.credentials, session)


async def get_current_active_user(
    user: User = Depends(get_current_user),
) -> User:
    if user.account_status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conta suspensa")
    return user
