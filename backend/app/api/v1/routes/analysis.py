from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_premium_user, get_session
from app.models.models import User
from app.schemas.analysis import (
    CohortComparisonOut, ENEMHistoricalOut,
    ProbableTopicsOut, TopicFrequencyOut,
)
from app.services import analysis_service

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/enem-historical", response_model=ENEMHistoricalOut)
async def get_enem_historical(
    user: User = Depends(get_premium_user),
    session: AsyncSession = Depends(get_session),
):
    return await analysis_service.get_enem_historical(str(user.id), session)


@router.get("/topic-frequency", response_model=TopicFrequencyOut)
async def get_topic_frequency(
    user: User = Depends(get_premium_user),
):
    return analysis_service.get_topic_frequency()


@router.get("/cohort-comparison", response_model=CohortComparisonOut)
async def get_cohort_comparison(
    user: User = Depends(get_premium_user),
    session: AsyncSession = Depends(get_session),
):
    return await analysis_service.get_cohort_comparison(str(user.id), session)


@router.get("/probable-topics", response_model=ProbableTopicsOut)
async def get_probable_topics(
    user: User = Depends(get_premium_user),
):
    return analysis_service.get_probable_topics()
