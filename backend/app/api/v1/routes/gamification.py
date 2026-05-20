from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.db.engine import get_session
from app.models.models import User
from app.schemas.gamification import GamificationResponse, LeaderboardResponse
from app.services import gamification_service

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/me", response_model=GamificationResponse)
async def get_my_gamification(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await gamification_service.get_my_gamification(current_user, session)


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await gamification_service.get_leaderboard(current_user, session)
