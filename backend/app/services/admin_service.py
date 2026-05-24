"""
Serviço do Admin Dashboard.

Fornece: métricas da plataforma, CRUD de usuários, CRUD de questões e exportação CSV.
Todas as funções exigem que o chamador já tenha verificado role=admin.
"""

import csv
import io
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import cast, distinct, func, or_
from sqlalchemy.types import Date as SADate
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.models import (
    Essay, EssayAnalysis, ExamResult, Question, QuestionOption,
    StudySession, Subscription, User, utcnow,
)
from app.schemas.admin import (
    AdminMetricsOut, AdminQuestionIn, AdminQuestionItem, AdminQuestionOptionIn,
    AdminQuestionsResponse, AdminUserItem, AdminUsersResponse,
    DailyActivityItem, SubPlanBucket, TriBucket,
)

# MRR mensal por plano
_PLAN_MRR: dict[str, float] = {
    "premium_1m": 59.90,
    "premium_3m": 33.30,   # 99.90 / 3
    "premium_6m": 24.98,   # 149.90 / 6
    "premium_trial": 0.0,
    "free": 0.0,
}

_TRI_BUCKETS = [
    ("< 400",   0,   400),
    ("400–499", 400, 500),
    ("500–599", 500, 600),
    ("600–699", 600, 700),
    ("700–799", 700, 800),
    ("800–899", 800, 900),
    ("900+",    900, 1001),
]

def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ── Metrics ────────────────────────────────────────────────────────

async def get_metrics(session: AsyncSession) -> AdminMetricsOut:
    now = _now()
    thirty_ago = now - timedelta(days=30)
    today = date.today()
    today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    today_end = today_start + timedelta(days=1)

    # Total users (not deleted)
    tu_r = await session.exec(
        select(func.count()).select_from(User)  # type: ignore[arg-type]
        .where(User.deleted_at.is_(None))
    )
    total_users: int = tu_r.one() or 0

    # New users last 30d
    nu_r = await session.exec(
        select(func.count()).select_from(User)  # type: ignore[arg-type]
        .where(User.deleted_at.is_(None))
        .where(User.created_at >= thirty_ago)
    )
    new_users_30d: int = nu_r.one() or 0

    # DAU (today) — distinct users with a study session today
    dau_r = await session.exec(
        select(func.count(distinct(StudySession.user_id)))  # type: ignore[arg-type]
        .where(StudySession.start_time >= today_start)
        .where(StudySession.start_time < today_end)
    )
    dau: int = dau_r.one() or 0

    # MAU (last 30d) — distinct users with any study session
    mau_r = await session.exec(
        select(func.count(distinct(StudySession.user_id)))  # type: ignore[arg-type]
        .where(StudySession.start_time >= thirty_ago)
    )
    mau: int = mau_r.one() or 0

    # Active subscriptions
    active_subs_r = await session.exec(
        select(Subscription)
        .where(Subscription.status == "active")
        .where(Subscription.end_date > now)
    )
    active_subs = active_subs_r.all()
    active_count = len(active_subs)
    mrr = sum(_PLAN_MRR.get(s.plan_type, 0.0) for s in active_subs)

    # Subscription distribution
    sub_dist: dict[str, int] = {}
    for s in active_subs:
        sub_dist[s.plan_type] = sub_dist.get(s.plan_type, 0) + 1
    sub_distribution = [SubPlanBucket(plan_type=k, count=v) for k, v in sub_dist.items()]

    # Churn (cancelled in last 30d / (cancelled + active) * 100)
    churn_r = await session.exec(
        select(func.count()).select_from(Subscription)  # type: ignore[arg-type]
        .where(Subscription.status == "cancelled")
        .where(Subscription.updated_at >= thirty_ago)
    )
    cancelled_30d: int = churn_r.one() or 0
    total_for_churn = active_count + cancelled_30d
    churn_rate = (cancelled_30d / total_for_churn * 100) if total_for_churn > 0 else 0.0

    # Essays analyzed last 30d
    ea_r = await session.exec(
        select(func.count()).select_from(EssayAnalysis)  # type: ignore[arg-type]
        .where(EssayAnalysis.analysed_at >= thirty_ago)
    )
    essays_30d: int = ea_r.one() or 0

    # Exams completed last 30d
    ex_r = await session.exec(
        select(func.count()).select_from(ExamResult)  # type: ignore[arg-type]
        .where(ExamResult.completed_at >= thirty_ago)
    )
    exams_30d: int = ex_r.one() or 0

    # TRI histogram
    tri_hist: list[TriBucket] = []
    for label, lo, hi in _TRI_BUCKETS:
        br = await session.exec(
            select(func.count()).select_from(ExamResult)  # type: ignore[arg-type]
            .where(ExamResult.score_estimate >= lo)
            .where(ExamResult.score_estimate < hi)
            .where(ExamResult.score_estimate.is_not(None))
        )
        tri_hist.append(TriBucket(label=label, count=br.one() or 0))

    # Daily active users — GROUP BY date (last 30 days)
    daily_stmt = (
        select(  # type: ignore[call-overload]
            cast(StudySession.start_time, SADate).label("day"),
            func.count(StudySession.id).label("sessions"),
            func.count(distinct(StudySession.user_id)).label("active_users"),
        )
        .where(StudySession.start_time >= thirty_ago)
        .group_by(cast(StudySession.start_time, SADate))
        .order_by(cast(StudySession.start_time, SADate))
    )
    daily_r = await session.execute(daily_stmt)
    daily_rows = daily_r.fetchall()

    daily_map: dict[str, DailyActivityItem] = {
        str(row.day): DailyActivityItem(
            date=str(row.day),
            sessions=row.sessions,
            active_users=row.active_users,
        )
        for row in daily_rows
    }
    daily_activity = [
        daily_map.get(
            (today - timedelta(days=29 - i)).isoformat(),
            DailyActivityItem(date=(today - timedelta(days=29 - i)).isoformat(), sessions=0, active_users=0),
        )
        for i in range(30)
    ]

    return AdminMetricsOut(
        total_users=total_users,
        new_users_30d=new_users_30d,
        dau=dau,
        mau=mau,
        active_subscriptions=active_count,
        mrr_brl=round(mrr, 2),
        essays_analyzed_30d=essays_30d,
        exams_completed_30d=exams_30d,
        churn_rate_pct=round(churn_rate, 1),
        sub_distribution=sub_distribution,
        tri_histogram=tri_hist,
        daily_activity=daily_activity,
    )


# ── Users ──────────────────────────────────────────────────────────

async def list_users(
    page: int,
    per_page: int,
    search: str | None,
    status_filter: str | None,
    session: AsyncSession,
) -> AdminUsersResponse:
    base = select(User).where(User.deleted_at.is_(None))

    if search:
        base = base.where(
            or_(User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%"))
        )
    if status_filter:
        base = base.where(User.account_status == status_filter)

    # Count
    count_r = await session.exec(
        select(func.count()).select_from(base.subquery())  # type: ignore[arg-type]
    )
    total = count_r.one() or 0

    # Page
    users_r = await session.exec(
        base.order_by(User.created_at.desc())  # type: ignore[arg-type]
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    users = users_r.all()

    # Fetch latest active subscription per user in one query
    if users:
        user_ids = [u.id for u in users]
        subs_r = await session.exec(
            select(Subscription)
            .where(Subscription.user_id.in_(user_ids))  # type: ignore[arg-type]
            .order_by(Subscription.created_at.desc())  # type: ignore[arg-type]
        )
        all_subs = subs_r.all()
        # Keep latest sub per user (list is ordered desc)
        sub_map: dict[uuid.UUID, Subscription] = {}
        for s in all_subs:
            if s.user_id not in sub_map:
                sub_map[s.user_id] = s

    else:
        sub_map = {}

    items = [
        AdminUserItem(
            id=str(u.id),
            name=u.name,
            email=u.email,
            role=u.role,
            account_status=u.account_status,
            plan_type=sub_map[u.id].plan_type if u.id in sub_map else None,
            plan_status=sub_map[u.id].status if u.id in sub_map else None,
            created_at=u.created_at.isoformat(),
        )
        for u in users
    ]

    return AdminUsersResponse(items=items, total=total, page=page, per_page=per_page)


async def update_user_status(user_id: str, new_status: str, session: AsyncSession) -> AdminUserItem:
    if new_status not in ("active", "suspended"):
        raise HTTPException(status_code=400, detail="Status inválido. Use 'active' ou 'suspended'.")

    r = await session.exec(select(User).where(User.id == uuid.UUID(user_id)))
    user = r.first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    user.account_status = new_status
    user.updated_at = utcnow()
    session.add(user)
    await session.commit()

    return AdminUserItem(
        id=str(user.id), name=user.name, email=user.email, role=user.role,
        account_status=user.account_status, plan_type=None, plan_status=None,
        created_at=user.created_at.isoformat(),
    )


async def delete_user(user_id: str, session: AsyncSession) -> None:
    r = await session.exec(select(User).where(User.id == uuid.UUID(user_id)))
    user = r.first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    user.deleted_at = utcnow()
    user.account_status = "deleted"
    session.add(user)
    await session.commit()


# ── Questions ──────────────────────────────────────────────────────

async def _question_with_options(q: Question, session: AsyncSession) -> AdminQuestionItem:
    opts_r = await session.exec(
        select(QuestionOption)
        .where(QuestionOption.question_id == q.id)
        .order_by(QuestionOption.position)  # type: ignore[arg-type]
    )
    opts = [AdminQuestionOptionIn(letter=o.letter, text=o.text) for o in opts_r.all()]
    return AdminQuestionItem(
        id=str(q.id),
        source=q.source,
        subject=q.subject,
        topic=q.topic,
        difficulty=q.difficulty,
        year=q.year,
        statement=q.statement,
        correct_answer=q.correct_answer,
        options=opts,
        created_at=q.created_at.isoformat(),
    )


async def list_questions(
    page: int,
    per_page: int,
    subject: str | None,
    difficulty: str | None,
    search: str | None,
    session: AsyncSession,
) -> AdminQuestionsResponse:
    base = select(Question)

    if subject:
        base = base.where(Question.subject == subject)
    if difficulty:
        base = base.where(Question.difficulty == difficulty)
    if search:
        base = base.where(Question.statement.ilike(f"%{search}%"))

    count_r = await session.exec(
        select(func.count()).select_from(base.subquery())  # type: ignore[arg-type]
    )
    total = count_r.one() or 0

    qs_r = await session.exec(
        base.order_by(Question.created_at.desc())  # type: ignore[arg-type]
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    questions = qs_r.all()

    items = [await _question_with_options(q, session) for q in questions]
    return AdminQuestionsResponse(items=items, total=total, page=page, per_page=per_page)


async def create_question(data: AdminQuestionIn, session: AsyncSession) -> AdminQuestionItem:
    q = Question(
        id=uuid.uuid4(),
        source=data.source,
        subject=data.subject,
        topic=data.topic,
        subtopic=data.subtopic,
        difficulty=data.difficulty,
        year=data.year,
        statement=data.statement,
        correct_answer=data.correct_answer,
        explanation=data.explanation,
    )
    session.add(q)
    await session.flush()

    for i, opt in enumerate(data.options):
        session.add(QuestionOption(
            id=uuid.uuid4(),
            question_id=q.id,
            letter=opt.letter,
            text=opt.text,
            position=i + 1,
        ))

    await session.commit()
    return await _question_with_options(q, session)


async def update_question(question_id: str, data: AdminQuestionIn, session: AsyncSession) -> AdminQuestionItem:
    r = await session.exec(select(Question).where(Question.id == uuid.UUID(question_id)))
    q = r.first()
    if not q:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")

    q.source = data.source
    q.subject = data.subject
    q.topic = data.topic
    q.subtopic = data.subtopic
    q.difficulty = data.difficulty
    q.year = data.year
    q.statement = data.statement
    q.correct_answer = data.correct_answer
    q.explanation = data.explanation
    q.updated_at = utcnow()
    session.add(q)

    # Replace options
    old_opts_r = await session.exec(
        select(QuestionOption).where(QuestionOption.question_id == q.id)
    )
    for old in old_opts_r.all():
        await session.delete(old)
    await session.flush()

    for i, opt in enumerate(data.options):
        session.add(QuestionOption(
            id=uuid.uuid4(),
            question_id=q.id,
            letter=opt.letter,
            text=opt.text,
            position=i + 1,
        ))

    await session.commit()
    return await _question_with_options(q, session)


async def delete_question(question_id: str, session: AsyncSession) -> None:
    r = await session.exec(select(Question).where(Question.id == uuid.UUID(question_id)))
    q = r.first()
    if not q:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")

    opts_r = await session.exec(
        select(QuestionOption).where(QuestionOption.question_id == q.id)
    )
    for opt in opts_r.all():
        await session.delete(opt)

    await session.delete(q)
    await session.commit()


# ── CSV exports ────────────────────────────────────────────────────

async def export_subscriptions_csv(session: AsyncSession) -> str:
    subs_r = await session.exec(
        select(Subscription, User)
        .join(User, User.id == Subscription.user_id)
        .order_by(Subscription.created_at.desc())  # type: ignore[arg-type]
    )
    rows = subs_r.all()

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "user_name", "user_email", "plan_type", "status",
                "amount_paid", "start_date", "end_date", "created_at"])
    for sub, user in rows:
        w.writerow([
            str(sub.id), user.name, user.email, sub.plan_type, sub.status,
            str(sub.amount_paid or ""), sub.start_date.isoformat(),
            sub.end_date.isoformat(), sub.created_at.isoformat(),
        ])
    return buf.getvalue()


async def export_essays_csv(session: AsyncSession) -> str:
    essays_r = await session.exec(
        select(Essay, User)
        .join(User, User.id == Essay.user_id)
        .where(Essay.status == "reviewed")
        .order_by(Essay.submitted_at.desc())  # type: ignore[arg-type]
    )
    rows = essays_r.all()

    # Load analyses
    essay_ids = [e.id for e, _ in rows]
    analyses: dict[uuid.UUID, EssayAnalysis] = {}
    if essay_ids:
        analyses_r = await session.exec(
            select(EssayAnalysis).where(EssayAnalysis.essay_id.in_(essay_ids))  # type: ignore[arg-type]
        )
        for a in analyses_r.all():
            analyses[a.essay_id] = a

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["essay_id", "user_name", "user_email", "theme_title",
                "ai_score", "word_count", "submitted_at", "analysed_at"])
    for essay, user in rows:
        a = analyses.get(essay.id)
        w.writerow([
            str(essay.id), user.name, user.email, essay.theme_title or "",
            a.ai_score if a else "", essay.word_count or "",
            essay.submitted_at.isoformat() if essay.submitted_at else "",
            a.analysed_at.isoformat() if a else "",
        ])
    return buf.getvalue()
