from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.db.engine import get_session
from app.models.models import User
from app.schemas.contingency import ContingencyStatusOut, TurboSessionOut
from app.schemas.study_plan import StudyPlanResponse
from app.services import contingency_service

router = APIRouter(prefix="/contingency", tags=["contingency"])


@router.get("/status", response_model=ContingencyStatusOut)
async def get_status(
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await contingency_service.get_status(str(user.id), session)


@router.post("/regenerate", response_model=StudyPlanResponse)
async def regenerate_plan(
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await contingency_service.regenerate(str(user.id), session)


@router.get("/turbo-session", response_model=TurboSessionOut)
async def get_turbo_session(
    subject: str | None = None,
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await contingency_service.get_turbo_session(subject, str(user.id), session)
