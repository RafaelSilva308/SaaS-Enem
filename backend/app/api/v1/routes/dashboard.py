from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.core.redis import get_redis
from app.db.engine import get_session
from app.models.models import User
from app.schemas.dashboard import (
    DashboardResponse,
    EndSessionRequest,
    EndSessionResponse,
    StartSessionRequest,
    StartSessionResponse,
)
import app.services.dashboard_service as svc

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_DASHBOARD_TTL = 300  # 5 minutes


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    redis = await get_redis()
    cache_key = f"dashboard:{current_user.id}"

    cached = await redis.get(cache_key)
    if cached:
        return DashboardResponse.model_validate_json(cached)

    result = await svc.get_dashboard(current_user, session)
    try:
        await redis.set(cache_key, result.model_dump_json(), ex=_DASHBOARD_TTL)
    except Exception:
        pass
    return result


@router.post("/study-sessions/start", response_model=StartSessionResponse)
async def start_session(
    body: StartSessionRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.start_session(current_user, body.topic_id, body.session_type, session)


@router.post("/study-sessions/end", response_model=EndSessionResponse)
async def end_session(
    body: EndSessionRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.end_session(current_user, body.session_id, session)
