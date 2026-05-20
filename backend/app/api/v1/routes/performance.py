from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.db.engine import get_session
from app.models.models import User
from app.schemas.performance import (
    ComparisonData, ENEMPredictionResponse, ErrorPatternsData,
    OverviewData, SubjectDeepDiveData, TRIHistoryResponse,
)
from app.services import performance_service

router = APIRouter(prefix="/performance", tags=["performance"])


@router.get("/tri-history", response_model=TRIHistoryResponse)
async def get_tri_history(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await performance_service.get_tri_history(current_user, session)


@router.get("/enem-prediction", response_model=ENEMPredictionResponse)
async def get_enem_prediction(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await performance_service.get_enem_prediction(current_user, session)


@router.get("/overview", response_model=OverviewData)
async def get_overview(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await performance_service.get_overview(current_user, session)


@router.get("/error-patterns", response_model=ErrorPatternsData)
async def get_error_patterns(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await performance_service.get_error_patterns(current_user, session)


@router.get("/subject/{subject}", response_model=SubjectDeepDiveData)
async def get_subject_deep_dive(
    subject: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await performance_service.get_subject_deep_dive(current_user, subject, session)


@router.get("/comparison", response_model=ComparisonData)
async def get_comparison(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await performance_service.get_comparison(current_user, session)
