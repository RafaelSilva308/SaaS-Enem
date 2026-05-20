from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.core.redis import get_redis
from app.db.engine import get_session
from app.models.models import User
from app.schemas.questions import (
    AnswerRequest,
    AnswerResponse,
    MarkDoubtResponse,
    QuestionDetailOut,
    QuestionsListResponse,
)
import app.services.questions_service as svc

router = APIRouter(prefix="/questions", tags=["questions"])

_QUESTIONS_TTL = 3600  # 1 hour


@router.get("", response_model=QuestionsListResponse)
async def list_questions(
    subject: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    year: int | None = Query(default=None),
    source: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    redis = await get_redis()
    cache_key = f"q:{current_user.id}:{subject}:{difficulty}:{year}:{source}:{page}:{per_page}"

    cached = await redis.get(cache_key)
    if cached:
        return QuestionsListResponse.model_validate_json(cached)

    result = await svc.list_questions(
        current_user, session, subject, difficulty, year, source, page, per_page,
    )
    try:
        await redis.set(cache_key, result.model_dump_json(), ex=_QUESTIONS_TTL)
    except Exception:
        pass
    return result


@router.get("/recommended", response_model=QuestionsListResponse)
async def get_recommended(
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.get_recommended(current_user, session, limit)


@router.get("/doubts", response_model=QuestionsListResponse)
async def get_doubts(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.get_doubts(current_user, session)


@router.get("/{question_id}", response_model=QuestionDetailOut)
async def get_question_detail(
    question_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.get_question_detail(current_user, question_id, session)


@router.post("/answer", response_model=AnswerResponse)
async def answer_question(
    body: AnswerRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.answer_question(current_user, body.question_id, body.answer, session)


@router.post("/{question_id}/mark-doubt", response_model=MarkDoubtResponse)
async def mark_doubt(
    question_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await svc.mark_doubt(current_user, question_id, session)
