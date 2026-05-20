from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.db.engine import get_session
from app.models.models import User
from app.schemas.study_plan import (
    AdjustPlanRequest,
    CompleteTopicResponse,
    GeneratePlanRequest,
    StudyPlanResponse,
)
from app.services import study_plan_service

router = APIRouter(prefix="/study-plans", tags=["study-plans"])


@router.post("/generate", response_model=StudyPlanResponse, status_code=201)
async def generate_plan(
    data: GeneratePlanRequest,
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await study_plan_service.generate_plan(str(user.id), data.force_regenerate, session)


@router.get("/me", response_model=StudyPlanResponse)
async def get_my_plan(
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await study_plan_service.get_my_plan(str(user.id), session)


@router.put("/{plan_id}/adjust", response_model=StudyPlanResponse)
async def adjust_plan(
    plan_id: str,
    data: AdjustPlanRequest,
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await study_plan_service.adjust_plan(plan_id, str(user.id), data, session)


@router.post("/topics/{topic_id}/complete", response_model=CompleteTopicResponse)
async def complete_topic(
    topic_id: str,
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await study_plan_service.complete_topic(topic_id, str(user.id), session)
