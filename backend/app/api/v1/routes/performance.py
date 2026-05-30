from typing import Awaitable, Callable, TypeVar

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.core.redis import get_redis
from app.db.engine import get_session
from app.models.models import User
from app.schemas.performance import (
    ComparisonData, ENEMPredictionResponse, ErrorPatternsData,
    OverviewData, SubjectDeepDiveData, TRIHistoryResponse,
)
from app.services import performance_service

router = APIRouter(prefix="/performance", tags=["performance"])

_PERF_TTL = 1800  # 30 minutos — invalidado ao submeter um simulado

M = TypeVar("M", bound=BaseModel)


async def _cached(key: str, model_cls: type[M], producer: Callable[[], Awaitable[M]]) -> M:
    """
    Lê do cache Redis se presente, senão executa o producer e grava o resultado.
    Mesmo padrão de dashboard.py: serializa via model_dump_json/model_validate_json.
    Falhas de cache são silenciosas — o producer sempre é a fonte de verdade.
    """
    redis = await get_redis()
    try:
        cached = await redis.get(key)
        if cached:
            return model_cls.model_validate_json(cached)
    except Exception:
        pass

    result = await producer()
    try:
        await redis.set(key, result.model_dump_json(), ex=_PERF_TTL)
    except Exception:
        pass
    return result


@router.get("/tri-history", response_model=TRIHistoryResponse)
async def get_tri_history(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await _cached(
        f"perf:{current_user.id}:tri-history", TRIHistoryResponse,
        lambda: performance_service.get_tri_history(current_user, session),
    )


@router.get("/enem-prediction", response_model=ENEMPredictionResponse)
async def get_enem_prediction(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await _cached(
        f"perf:{current_user.id}:enem-prediction", ENEMPredictionResponse,
        lambda: performance_service.get_enem_prediction(current_user, session),
    )


@router.get("/overview", response_model=OverviewData)
async def get_overview(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await _cached(
        f"perf:{current_user.id}:overview", OverviewData,
        lambda: performance_service.get_overview(current_user, session),
    )


@router.get("/error-patterns", response_model=ErrorPatternsData)
async def get_error_patterns(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await _cached(
        f"perf:{current_user.id}:error-patterns", ErrorPatternsData,
        lambda: performance_service.get_error_patterns(current_user, session),
    )


@router.get("/subject/{subject}", response_model=SubjectDeepDiveData)
async def get_subject_deep_dive(
    subject: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await _cached(
        f"perf:{current_user.id}:subject:{subject}", SubjectDeepDiveData,
        lambda: performance_service.get_subject_deep_dive(current_user, subject, session),
    )


@router.get("/comparison", response_model=ComparisonData)
async def get_comparison(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await _cached(
        f"perf:{current_user.id}:comparison", ComparisonData,
        lambda: performance_service.get_comparison(current_user, session),
    )
