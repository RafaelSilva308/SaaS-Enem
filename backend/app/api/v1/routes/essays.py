from fastapi import APIRouter, BackgroundTasks, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.db.engine import get_session
from app.models.models import User
from app.schemas.essays import (
    CreateEssayRequest, CreateEssayResponse, EssayListItem,
    EssayOut, SubmitResponse, ThemesResponse, UpdateEssayRequest,
)
from app.services import essays_service
from app.services import essay_ai_service

router = APIRouter(prefix="/essays", tags=["essays"])


@router.get("/themes", response_model=ThemesResponse)
async def get_themes(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_active_user),
):
    return await essays_service.get_themes(session)


@router.get("", response_model=list[EssayListItem])
async def get_my_essays(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await essays_service.get_my_essays(current_user, session)


@router.post("", response_model=CreateEssayResponse, status_code=201)
async def create_essay(
    body: CreateEssayRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await essays_service.create_essay(
        current_user, body.theme_id, body.theme_title, session,
    )


@router.get("/{essay_id}", response_model=EssayOut)
async def get_essay(
    essay_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await essays_service.get_essay(current_user, essay_id, session)


@router.put("/{essay_id}", response_model=EssayListItem)
async def update_essay(
    essay_id: str,
    body: UpdateEssayRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await essays_service.update_essay(
        current_user, essay_id, body.text, body.word_count, body.line_count, session,
    )


@router.post("/{essay_id}/submit", response_model=SubmitResponse)
async def submit_essay(
    essay_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    result = await essays_service.submit_essay(current_user, essay_id, session)
    # Análise em background com sessão DB própria
    background_tasks.add_task(essay_ai_service.analyze_essay_background, essay_id)
    return result


@router.delete("/{essay_id}", status_code=204)
async def delete_essay(
    essay_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    await essays_service.delete_essay(current_user, essay_id, session)
