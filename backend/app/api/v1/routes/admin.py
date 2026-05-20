from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_admin, get_session
from app.models.models import User
from app.schemas.admin import (
    AdminMetricsOut, AdminQuestionIn, AdminQuestionItem,
    AdminQuestionsResponse, AdminUsersResponse, UserStatusUpdate,
)
from app.schemas.study_plan import StudyPlanResponse
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Metrics ────────────────────────────────────────────────────────

@router.get("/metrics", response_model=AdminMetricsOut)
async def get_metrics(
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    return await admin_service.get_metrics(session)


# ── Users ──────────────────────────────────────────────────────────

@router.get("/users", response_model=AdminUsersResponse)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    status: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    return await admin_service.list_users(page, per_page, search, status, session)


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    data: UserStatusUpdate,
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    return await admin_service.update_user_status(user_id, data.status, session)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    await admin_service.delete_user(user_id, session)


# ── Questions ──────────────────────────────────────────────────────

@router.get("/questions", response_model=AdminQuestionsResponse)
async def list_questions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    subject: str | None = Query(None),
    difficulty: str | None = Query(None),
    search: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    return await admin_service.list_questions(page, per_page, subject, difficulty, search, session)


@router.post("/questions", response_model=AdminQuestionItem, status_code=201)
async def create_question(
    data: AdminQuestionIn,
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    return await admin_service.create_question(data, session)


@router.patch("/questions/{question_id}", response_model=AdminQuestionItem)
async def update_question(
    question_id: str,
    data: AdminQuestionIn,
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    return await admin_service.update_question(question_id, data, session)


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: str,
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    await admin_service.delete_question(question_id, session)


# ── Analytics CSV ──────────────────────────────────────────────────

@router.get("/analytics/subscriptions")
async def export_subscriptions(
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    csv_content = await admin_service.export_subscriptions_csv(session)
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=subscriptions.csv"},
    )


@router.get("/analytics/essays")
async def export_essays(
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
):
    csv_content = await admin_service.export_essays_csv(session)
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=essays.csv"},
    )
