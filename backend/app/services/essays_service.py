import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.data.essay_themes import ESSAY_THEMES
from app.models.models import (
    Essay, EssayAnalysis, EssayTheme, Subscription, User, utcnow,
)
from app.schemas.essays import (
    CreateEssayResponse, EssayAnalysisOut, EssayListItem,
    EssayOut, EssayThemeOut, GrammarError, SubmitResponse, ThemesResponse,
)

FREEMIUM_MONTHLY_LIMIT = 2


# ── Seed temas ─────────────────────────────────────────────────────

async def _ensure_themes_seeded(db: AsyncSession) -> None:
    count_r = await db.exec(
        select(func.count()).select_from(EssayTheme)  # type: ignore[arg-type]
    )
    count = count_r.first() or 0
    if count >= len(ESSAY_THEMES):
        return

    for t in ESSAY_THEMES:
        db.add(EssayTheme(
            title=t["title"],
            description=t.get("description"),
            year=t.get("year"),
            source=t.get("source", "enem_official"),
            is_active=True,
        ))
    await db.commit()


# ── Rate limiting ──────────────────────────────────────────────────

async def _check_submission_limit(user: User, db: AsyncSession) -> None:
    """Levanta HTTPException 429 se o usuário freemium atingiu o limite mensal."""
    sub_r = await db.exec(
        select(Subscription)
        .where(Subscription.user_id == user.id)
        .where(Subscription.status == "active")
        .order_by(Subscription.created_at.desc())  # type: ignore[arg-type]
    )
    sub = sub_r.first()
    is_premium = sub and sub.plan_type != "free"
    if is_premium:
        return

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    count_r = await db.exec(
        select(func.count()).select_from(Essay)  # type: ignore[arg-type]
        .where(Essay.user_id == user.id)
        .where(Essay.status.in_(["submitted", "under_review", "reviewed"]))
        .where(Essay.submitted_at >= month_start)
    )
    count = count_r.first() or 0

    if count >= FREEMIUM_MONTHLY_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Limite freemium: {FREEMIUM_MONTHLY_LIMIT} redações/mês. Assine um plano premium para envios ilimitados.",
        )


# ── Helpers ────────────────────────────────────────────────────────

def _analysis_to_out(a: EssayAnalysis) -> EssayAnalysisOut:
    errors = a.grammar_errors or []
    suggestions = a.suggestions or []
    return EssayAnalysisOut(
        ai_score=a.ai_score or 0,
        competency1_score=a.competency1_score or 0,
        competency2_score=a.competency2_score or 0,
        competency3_score=a.competency3_score or 0,
        competency4_score=a.competency4_score or 0,
        competency5_score=a.competency5_score or 0,
        structural_feedback=a.structural_feedback,
        argument_feedback=a.argument_feedback,
        language_feedback=a.language_feedback,
        grammar_errors=[
            GrammarError(
                line=e.get("line", 0),
                excerpt=e.get("excerpt", ""),
                correction=e.get("correction", ""),
                type=e.get("type", "outro"),
            )
            for e in (errors if isinstance(errors, list) else [])
        ],
        suggestions=[s for s in (suggestions if isinstance(suggestions, list) else [])],
        analysed_at=a.analysed_at,
    )


# ── Endpoints logic ────────────────────────────────────────────────

async def get_themes(db: AsyncSession) -> ThemesResponse:
    await _ensure_themes_seeded(db)
    themes_r = await db.exec(
        select(EssayTheme).where(EssayTheme.is_active == True)  # noqa: E712
        .order_by(EssayTheme.year.desc())  # type: ignore[arg-type]
    )
    themes = themes_r.all()
    return ThemesResponse(themes=[
        EssayThemeOut(
            id=str(t.id),
            title=t.title,
            description=t.description,
            year=t.year,
            source=t.source,
        )
        for t in themes
    ])


async def get_my_essays(user: User, db: AsyncSession) -> list[EssayListItem]:
    essays_r = await db.exec(
        select(Essay)
        .where(Essay.user_id == user.id)
        .order_by(Essay.created_at.desc())  # type: ignore[arg-type]
    )
    essays = essays_r.all()
    if not essays:
        return []

    essay_ids = [e.id for e in essays]
    analyses_r = await db.exec(
        select(EssayAnalysis).where(EssayAnalysis.essay_id.in_(essay_ids))  # type: ignore[arg-type]
    )
    score_map = {a.essay_id: a.ai_score for a in analyses_r.all()}

    return [
        EssayListItem(
            id=str(e.id),
            theme_title=e.theme_title,
            word_count=e.word_count,
            line_count=e.line_count,
            status=e.status,
            submitted_at=e.submitted_at,
            created_at=e.created_at,
            ai_score=score_map.get(e.id),
        )
        for e in essays
    ]


async def create_essay(
    user: User,
    theme_id: str | None,
    theme_title: str,
    db: AsyncSession,
) -> CreateEssayResponse:
    essay = Essay(
        user_id=user.id,
        theme_id=uuid.UUID(theme_id) if theme_id else None,
        theme_title=theme_title,
        text="",
        status="draft",
    )
    db.add(essay)
    await db.commit()
    await db.refresh(essay)
    return CreateEssayResponse(essay_id=str(essay.id), status="draft")


async def update_essay(
    user: User,
    essay_id: str,
    text: str,
    word_count: int,
    line_count: int,
    db: AsyncSession,
) -> EssayListItem:
    result = await db.exec(
        select(Essay)
        .where(Essay.id == uuid.UUID(essay_id))
        .where(Essay.user_id == user.id)
        .where(Essay.status == "draft")
    )
    essay = result.first()
    if not essay:
        raise HTTPException(status_code=404, detail="Redação não encontrada ou não é rascunho")

    essay.text = text
    essay.word_count = word_count
    essay.line_count = line_count
    db.add(essay)
    await db.commit()
    await db.refresh(essay)

    return EssayListItem(
        id=str(essay.id),
        theme_title=essay.theme_title,
        word_count=essay.word_count,
        line_count=essay.line_count,
        status=essay.status,
        submitted_at=essay.submitted_at,
        created_at=essay.created_at,
        ai_score=None,
    )


async def get_essay(user: User, essay_id: str, db: AsyncSession) -> EssayOut:
    result = await db.exec(
        select(Essay)
        .where(Essay.id == uuid.UUID(essay_id))
        .where(Essay.user_id == user.id)
    )
    essay = result.first()
    if not essay:
        raise HTTPException(status_code=404, detail="Redação não encontrada")

    analysis: EssayAnalysisOut | None = None
    if essay.status == "reviewed":
        analysis_r = await db.exec(
            select(EssayAnalysis).where(EssayAnalysis.essay_id == essay.id)
        )
        analysis_obj = analysis_r.first()
        if analysis_obj:
            analysis = _analysis_to_out(analysis_obj)

    return EssayOut(
        id=str(essay.id),
        theme_id=str(essay.theme_id) if essay.theme_id else None,
        theme_title=essay.theme_title,
        text=essay.text or "",
        word_count=essay.word_count,
        line_count=essay.line_count,
        status=essay.status,
        submitted_at=essay.submitted_at,
        created_at=essay.created_at,
        analysis=analysis,
    )


async def submit_essay(user: User, essay_id: str, db: AsyncSession) -> SubmitResponse:
    await _check_submission_limit(user, db)

    result = await db.exec(
        select(Essay)
        .where(Essay.id == uuid.UUID(essay_id))
        .where(Essay.user_id == user.id)
        .where(Essay.status == "draft")
    )
    essay = result.first()
    if not essay:
        raise HTTPException(status_code=404, detail="Redação não encontrada ou já enviada")

    if not essay.text or len(essay.text.strip()) < 50:
        raise HTTPException(status_code=400, detail="A redação está muito curta para ser avaliada")

    essay.status = "under_review"
    essay.submitted_at = utcnow()
    db.add(essay)
    await db.commit()

    return SubmitResponse(
        essay_id=essay_id,
        status="under_review",
        message="Redação enviada para análise. Aguarde alguns segundos.",
    )


async def delete_essay(user: User, essay_id: str, db: AsyncSession) -> None:
    result = await db.exec(
        select(Essay)
        .where(Essay.id == uuid.UUID(essay_id))
        .where(Essay.user_id == user.id)
        .where(Essay.status == "draft")
    )
    essay = result.first()
    if not essay:
        raise HTTPException(status_code=404, detail="Redação não encontrada ou não pode ser excluída")
    await db.delete(essay)
    await db.commit()
