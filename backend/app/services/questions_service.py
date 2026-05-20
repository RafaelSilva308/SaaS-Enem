import uuid

from fastapi import HTTPException
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.data.seed_questions import SEED_QUESTIONS
from app.models.models import (
    Diagnostic, Question, QuestionOption, QuestionStat, User, utcnow,
)
from app.schemas.questions import (
    AnswerResponse, MarkDoubtResponse, QuestionDetailOut,
    QuestionListItem, QuestionsListResponse, QuestionOptionOut, UserStatOut,
)

SUBJECT_LABELS = {
    "linguagens": "Linguagens",
    "matematica": "Matemática",
    "cn": "Ciências da Natureza",
    "ch": "Ciências Humanas",
}


# ── Auto-seed ──────────────────────────────────────────────────────

async def _ensure_seeded(db: AsyncSession) -> None:
    count_result = await db.exec(select(func.count()).select_from(Question))  # type: ignore[arg-type]
    count = count_result.first() or 0
    if count >= len(SEED_QUESTIONS):
        return

    for q_data in SEED_QUESTIONS:
        q = Question(
            id=uuid.uuid4(),
            source="seed",
            subject=q_data["subject"],
            topic=q_data.get("topic"),
            difficulty=q_data.get("difficulty"),
            year=q_data.get("year"),
            statement=q_data["statement"],
            correct_answer=q_data["correct_answer"],
            explanation=q_data.get("explanation"),
            time_estimate_seconds=180,
        )
        db.add(q)
        await db.flush()

        for i, opt in enumerate(q_data["options"]):
            db.add(QuestionOption(
                id=uuid.uuid4(),
                question_id=q.id,
                letter=opt["letter"],
                text=opt["text"],
                position=i,
            ))

    await db.commit()


# ── Helpers ────────────────────────────────────────────────────────

def _stat_out(stat: QuestionStat | None) -> UserStatOut | None:
    if not stat:
        return None
    return UserStatOut(
        attempts=stat.attempts,
        correct=stat.correct,
        wrong=stat.wrong,
        marked_as_doubt=stat.marked_as_doubt,
    )


def _preview(statement: str) -> str:
    return statement[:160] + "..." if len(statement) > 160 else statement


def _question_to_item(q: Question, stat: QuestionStat | None) -> QuestionListItem:
    return QuestionListItem(
        id=str(q.id),
        subject=q.subject or "",
        subject_label=SUBJECT_LABELS.get(q.subject or "", q.subject or ""),
        topic=q.topic,
        difficulty=q.difficulty,
        year=q.year,
        source=q.source,
        statement_preview=_preview(q.statement),
        time_estimate_seconds=q.time_estimate_seconds,
        stat=_stat_out(stat),
    )


async def _attach_stats(
    questions: list[Question],
    user: User,
    db: AsyncSession,
) -> dict[uuid.UUID, QuestionStat]:
    if not questions:
        return {}
    q_ids = [q.id for q in questions]
    stats_result = await db.exec(
        select(QuestionStat)
        .where(QuestionStat.user_id == user.id)
        .where(QuestionStat.question_id.in_(q_ids))  # type: ignore[arg-type]
    )
    return {s.question_id: s for s in stats_result.all()}


# ── List questions ─────────────────────────────────────────────────

async def list_questions(
    user: User,
    db: AsyncSession,
    subject: str | None,
    difficulty: str | None,
    year: int | None,
    source: str | None,
    page: int,
    per_page: int,
) -> QuestionsListResponse:
    await _ensure_seeded(db)

    filters = []
    if subject:
        filters.append(Question.subject == subject)
    if difficulty:
        filters.append(Question.difficulty == difficulty)
    if year:
        filters.append(Question.year == year)
    if source:
        filters.append(Question.source == source)

    count_q = select(func.count()).select_from(Question)  # type: ignore[arg-type]
    for f in filters:
        count_q = count_q.where(f)
    total = (await db.exec(count_q)).first() or 0

    offset = (page - 1) * per_page
    main_q = select(Question)
    for f in filters:
        main_q = main_q.where(f)
    main_q = (
        main_q.order_by(Question.year.desc())  # type: ignore[arg-type]
        .offset(offset)
        .limit(per_page)
    )
    questions = (await db.exec(main_q)).all()
    stats_map = await _attach_stats(list(questions), user, db)

    items = [_question_to_item(q, stats_map.get(q.id)) for q in questions]
    total_pages = max(1, (total + per_page - 1) // per_page)
    return QuestionsListResponse(
        questions=items, total=total, page=page,
        per_page=per_page, total_pages=total_pages,
    )


# ── Recommended ────────────────────────────────────────────────────

async def get_recommended(
    user: User,
    db: AsyncSession,
    limit: int = 20,
) -> QuestionsListResponse:
    await _ensure_seeded(db)

    diag_result = await db.exec(
        select(Diagnostic)
        .where(Diagnostic.user_id == user.id)
        .order_by(Diagnostic.completed_at.desc())  # type: ignore[arg-type]
    )
    diag = diag_result.first()

    target_subjects: list[str] = []
    if diag:
        scores = {
            "linguagens": diag.linguagens_score or 0,
            "matematica": diag.matematica_score or 0,
            "cn": diag.cn_score or 0,
            "ch": diag.ch_score or 0,
        }
        target_subjects = sorted(scores.keys(), key=lambda s: scores[s])

    correct_result = await db.exec(
        select(QuestionStat.question_id)
        .where(QuestionStat.user_id == user.id)
        .where(QuestionStat.correct > 0)
    )
    correct_ids = list(correct_result.all())

    q_query = select(Question)
    if target_subjects:
        q_query = q_query.where(Question.subject.in_(target_subjects[:2]))  # type: ignore[arg-type]
    if correct_ids:
        q_query = q_query.where(Question.id.notin_(correct_ids))  # type: ignore[arg-type]
    q_query = q_query.order_by(Question.difficulty).limit(limit)  # type: ignore[arg-type]

    questions = (await db.exec(q_query)).all()
    stats_map = await _attach_stats(list(questions), user, db)

    items = [_question_to_item(q, stats_map.get(q.id)) for q in questions]
    return QuestionsListResponse(
        questions=items, total=len(items), page=1, per_page=limit, total_pages=1,
    )


# ── Doubts ─────────────────────────────────────────────────────────

async def get_doubts(user: User, db: AsyncSession) -> QuestionsListResponse:
    await _ensure_seeded(db)

    doubt_ids_result = await db.exec(
        select(QuestionStat.question_id)
        .where(QuestionStat.user_id == user.id)
        .where(QuestionStat.marked_as_doubt == True)  # noqa: E712
    )
    doubt_ids = list(doubt_ids_result.all())

    if not doubt_ids:
        return QuestionsListResponse(questions=[], total=0, page=1, per_page=50, total_pages=1)

    questions = (await db.exec(
        select(Question).where(Question.id.in_(doubt_ids))  # type: ignore[arg-type]
    )).all()

    stats_map = await _attach_stats(list(questions), user, db)
    items = [_question_to_item(q, stats_map.get(q.id)) for q in questions]
    return QuestionsListResponse(
        questions=items, total=len(items), page=1, per_page=50, total_pages=1,
    )


# ── Detail ─────────────────────────────────────────────────────────

async def get_question_detail(
    user: User,
    question_id: str,
    db: AsyncSession,
) -> QuestionDetailOut:
    q_result = await db.exec(select(Question).where(Question.id == uuid.UUID(question_id)))
    question = q_result.first()
    if not question:
        raise HTTPException(status_code=404, detail="Questão não encontrada")

    opts_result = await db.exec(
        select(QuestionOption)
        .where(QuestionOption.question_id == question.id)
        .order_by(QuestionOption.letter)  # type: ignore[arg-type]
    )
    options = opts_result.all()

    stat_result = await db.exec(
        select(QuestionStat)
        .where(QuestionStat.user_id == user.id)
        .where(QuestionStat.question_id == question.id)
    )
    stat = stat_result.first()

    return QuestionDetailOut(
        id=str(question.id),
        subject=question.subject or "",
        subject_label=SUBJECT_LABELS.get(question.subject or "", question.subject or ""),
        topic=question.topic,
        difficulty=question.difficulty,
        year=question.year,
        source=question.source,
        statement=question.statement,
        image_url=question.image_url,
        time_estimate_seconds=question.time_estimate_seconds,
        options=[QuestionOptionOut(letter=o.letter, text=o.text) for o in options],
        stat=_stat_out(stat),
    )


# ── Answer ─────────────────────────────────────────────────────────

async def answer_question(
    user: User,
    question_id: str,
    answer: str,
    db: AsyncSession,
) -> AnswerResponse:
    q_result = await db.exec(select(Question).where(Question.id == uuid.UUID(question_id)))
    question = q_result.first()
    if not question:
        raise HTTPException(status_code=404, detail="Questão não encontrada")

    is_correct = answer.upper() == (question.correct_answer or "").upper()

    stat_result = await db.exec(
        select(QuestionStat)
        .where(QuestionStat.user_id == user.id)
        .where(QuestionStat.question_id == question.id)
    )
    stat = stat_result.first()
    now = utcnow()

    if stat:
        stat.attempts += 1
        if is_correct:
            stat.correct += 1
        else:
            stat.wrong += 1
        stat.last_attempted = now
        stat.updated_at = now
    else:
        stat = QuestionStat(
            user_id=user.id,
            question_id=question.id,
            attempts=1,
            correct=1 if is_correct else 0,
            wrong=0 if is_correct else 1,
            last_attempted=now,
        )

    db.add(stat)
    await db.commit()
    await db.refresh(stat)

    xp = 5 if is_correct else 0
    if is_correct:
        try:
            from app.services.gamification_service import award_xp
            await award_xp(str(user.id), "question_correct", xp, db, question_id)
        except Exception:
            pass  # gamificação nunca quebra o fluxo principal

    return AnswerResponse(
        is_correct=is_correct,
        correct_answer=question.correct_answer or "",
        explanation=question.explanation,
        xp_earned=xp,
        stat=UserStatOut(
            attempts=stat.attempts,
            correct=stat.correct,
            wrong=stat.wrong,
            marked_as_doubt=stat.marked_as_doubt,
        ),
    )


# ── Mark doubt ─────────────────────────────────────────────────────

async def mark_doubt(
    user: User,
    question_id: str,
    db: AsyncSession,
) -> MarkDoubtResponse:
    q_uuid = uuid.UUID(question_id)
    stat_result = await db.exec(
        select(QuestionStat)
        .where(QuestionStat.user_id == user.id)
        .where(QuestionStat.question_id == q_uuid)
    )
    stat = stat_result.first()

    if stat:
        stat.marked_as_doubt = not stat.marked_as_doubt
    else:
        stat = QuestionStat(
            user_id=user.id,
            question_id=q_uuid,
            marked_as_doubt=True,
        )

    db.add(stat)
    await db.commit()
    await db.refresh(stat)

    return MarkDoubtResponse(
        question_id=question_id,
        marked_as_doubt=stat.marked_as_doubt,
    )
