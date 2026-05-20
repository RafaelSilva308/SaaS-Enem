from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.db.engine import get_session
from app.models.models import User
from app.schemas.diagnostic import (
    DiagnosticQuestionsResponse,
    DiagnosticResult,
    DiagnosticStatusResponse,
    DiagnosticSubmitRequest,
)
from app.services import diagnostic_service

router = APIRouter(prefix="/diagnostic", tags=["diagnostic"])


@router.get("/questions", response_model=DiagnosticQuestionsResponse)
async def get_questions(
    _: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await diagnostic_service.get_diagnostic_questions(session)


@router.post("/submit", response_model=DiagnosticResult, status_code=201)
async def submit_diagnostic(
    data: DiagnosticSubmitRequest,
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await diagnostic_service.submit_diagnostic(str(user.id), data, session)


@router.get("/result", response_model=DiagnosticResult)
async def get_result(
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await diagnostic_service.get_diagnostic_result(str(user.id), session)


@router.get("/status", response_model=DiagnosticStatusResponse)
async def get_status(
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await diagnostic_service.get_onboarding_status(str(user.id), session)
