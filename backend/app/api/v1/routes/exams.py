from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.db.engine import get_session
from app.models.models import User
from app.schemas.exams import (
    CreateExamRequest,
    CreateExamResponse,
    ExamResultDetail,
    SaveAnswerRequest,
    SaveAnswerResponse,
    ScheduledExamSummary,
    StartExamResponse,
    SubmitExamResponse,
    ToggleMarkRequest,
    ToggleMarkResponse,
)
import app.services.exams_service as svc

router = APIRouter(prefix="/exams", tags=["exams"])


@router.post("/create", response_model=CreateExamResponse, status_code=201)
async def create_exam(
    body: CreateExamRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.create_exam(current_user, body, session)


@router.get("/scheduled", response_model=list[ScheduledExamSummary])
async def list_scheduled(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.list_scheduled_exams(current_user, session)


@router.post("/scheduled/{scheduled_exam_id}/start", response_model=StartExamResponse)
async def start_exam(
    scheduled_exam_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.start_exam(current_user, scheduled_exam_id, session)


@router.put("/scheduled/{scheduled_exam_id}/save-answer", response_model=SaveAnswerResponse)
async def save_answer(
    scheduled_exam_id: str,
    body: SaveAnswerRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.save_answer(
        current_user, scheduled_exam_id, body.question_id, body.answer, session,
    )


@router.put("/scheduled/{scheduled_exam_id}/toggle-mark", response_model=ToggleMarkResponse)
async def toggle_mark(
    scheduled_exam_id: str,
    body: ToggleMarkRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.toggle_mark(current_user, scheduled_exam_id, body.question_id, session)


@router.post("/scheduled/{scheduled_exam_id}/submit", response_model=SubmitExamResponse)
async def submit_exam(
    scheduled_exam_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.submit_exam(current_user, scheduled_exam_id, session)


@router.get("/scheduled/{scheduled_exam_id}/result", response_model=ExamResultDetail)
async def get_result(
    scheduled_exam_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.get_result(current_user, scheduled_exam_id, session)
