import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.models import (
    LearningProfile, Notification, StudyPlan, StudySession,
    Topic, User, WeeklySprint,
)
from app.schemas.dashboard import (
    CountdownData, CurrentSprintData, DailyGoalData, DashboardResponse,
    EndSessionResponse, NotificationItem, RecommendationData,
    StartSessionResponse, WeeklyActivityItem,
)

ENEM_DT = datetime(2026, 11, 2, 8, 0, 0)

SUBJECT_LABELS = {
    "linguagens": "Linguagens",
    "matematica": "Matemática",
    "cn": "Ciências da Natureza",
    "ch": "Ciências Humanas",
    "redacao": "Redação",
}

DAY_LABELS = {
    "monday": "Seg", "tuesday": "Ter", "wednesday": "Qua",
    "thursday": "Qui", "friday": "Sex", "saturday": "Sáb", "sunday": "Dom",
}

PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def _calc_countdown() -> CountdownData:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    delta = ENEM_DT - now
    if delta.total_seconds() <= 0:
        return CountdownData(days=0, hours=0, minutes=0, seconds=0, enem_date="2026-11-02")
    total = int(delta.total_seconds())
    days, rem = divmod(total, 86400)
    hours, rem = divmod(rem, 3600)
    minutes, seconds = divmod(rem, 60)
    return CountdownData(days=days, hours=hours, minutes=minutes, seconds=seconds, enem_date="2026-11-02")


async def get_dashboard(user: User, session: AsyncSession) -> DashboardResponse:
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Learning profile
    lp_result = await session.exec(
        select(LearningProfile).where(LearningProfile.user_id == user.id)
    )
    profile = lp_result.first()
    daily_goal = float(profile.daily_hours_goal) if profile else 2.0
    available_days = profile.available_days if profile else ["monday", "tuesday", "wednesday", "thursday", "friday"]
    today_weekday = now_utc.strftime("%A").lower()
    is_study_day = available_days is None or today_weekday in (available_days or [])

    # Today's completed sessions
    today_sessions_result = await session.exec(
        select(StudySession)
        .where(StudySession.user_id == user.id)
        .where(StudySession.start_time >= today_start)
        .where(StudySession.start_time < today_end)
        .where(StudySession.end_time != None)  # noqa: E711
    )
    today_sessions = today_sessions_result.all()
    hours_today = sum((s.duration_minutes or 0) / 60.0 for s in today_sessions)
    progress_pct = min(100, int((hours_today / daily_goal) * 100)) if daily_goal > 0 else 0

    daily_goal_data = DailyGoalData(
        hours_goal=daily_goal,
        hours_completed_today=round(hours_today, 2),
        progress_percent=progress_pct,
        is_study_day=is_study_day,
    )

    # Weekly activity (last 7 days)
    week_start = today_start - timedelta(days=6)
    week_sessions_result = await session.exec(
        select(StudySession)
        .where(StudySession.user_id == user.id)
        .where(StudySession.start_time >= week_start)
        .where(StudySession.end_time != None)  # noqa: E711
    )
    week_sessions = week_sessions_result.all()

    weekly_activity: list[WeeklyActivityItem] = []
    for i in range(7):
        day = today_start - timedelta(days=6 - i)
        day_end = day + timedelta(days=1)
        day_hours = sum(
            (s.duration_minutes or 0) / 60.0
            for s in week_sessions
            if day <= s.start_time < day_end
        )
        weekday_name = day.strftime("%A").lower()
        weekly_activity.append(WeeklyActivityItem(
            date=day.strftime("%Y-%m-%d"),
            day_label=DAY_LABELS.get(weekday_name, weekday_name[:3].capitalize()),
            hours=round(day_hours, 2),
            is_today=(i == 6),
        ))

    # Active study plan → current sprint + recommendation
    plan_result = await session.exec(
        select(StudyPlan)
        .where(StudyPlan.user_id == user.id)
        .where(StudyPlan.status == "active")
    )
    active_plan = plan_result.first()

    current_sprint_data: CurrentSprintData | None = None
    recommendation: RecommendationData | None = None

    if active_plan:
        today_date = date.today()
        sprint_result = await session.exec(
            select(WeeklySprint)
            .where(WeeklySprint.study_plan_id == active_plan.id)
            .where(WeeklySprint.start_date <= today_date)
            .where(WeeklySprint.end_date >= today_date)
        )
        current_sprint = sprint_result.first()

        if not current_sprint:
            next_result = await session.exec(
                select(WeeklySprint)
                .where(WeeklySprint.study_plan_id == active_plan.id)
                .where(WeeklySprint.start_date > today_date)
                .order_by(WeeklySprint.start_date)  # type: ignore[arg-type]
            )
            current_sprint = next_result.first()

        if current_sprint:
            topics_result = await session.exec(
                select(Topic).where(Topic.weekly_sprint_id == current_sprint.id)
            )
            topics = topics_result.all()
            total = len(topics)
            completed = sum(1 for t in topics if t.is_completed)
            hours_alloc = float(current_sprint.total_hours_allocated or 0)
            hours_done = float(current_sprint.hours_completed or 0)
            sprint_pct = min(100, int((hours_done / hours_alloc) * 100)) if hours_alloc > 0 else 0

            current_sprint_data = CurrentSprintData(
                week_number=current_sprint.week_number,
                theme=current_sprint.theme,
                start_date=current_sprint.start_date.isoformat(),
                end_date=current_sprint.end_date.isoformat(),
                hours_allocated=hours_alloc,
                hours_completed=hours_done,
                progress_percent=sprint_pct,
                topics_total=total,
                topics_completed=completed,
            )

            incomplete = sorted(
                [t for t in topics if not t.is_completed],
                key=lambda t: PRIORITY_ORDER.get(t.priority or "low", 3),
            )
            if incomplete:
                rec = incomplete[0]
                subj = rec.subject or "linguagens"
                recommendation = RecommendationData(
                    topic_id=str(rec.id),
                    topic_name=rec.name,
                    subject=subj,
                    subject_label=SUBJECT_LABELS.get(subj, subj.capitalize()),
                    hours_allocated=float(rec.hours_allocated or 1.0),
                    priority=rec.priority or "medium",
                    type=rec.type or "theory",
                )

    # Recent notifications
    notif_result = await session.exec(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())  # type: ignore[arg-type]
        .limit(5)
    )
    notifications = notif_result.all()
    recent_notifications = [
        NotificationItem(
            id=str(n.id),
            type=n.type,
            title=n.title,
            message=n.message,
            is_read=n.is_read,
            created_at=n.created_at,
        )
        for n in notifications
    ]

    return DashboardResponse(
        countdown=_calc_countdown(),
        daily_goal=daily_goal_data,
        weekly_activity=weekly_activity,
        current_sprint=current_sprint_data,
        next_exam=None,
        recommendation=recommendation,
        recent_notifications=recent_notifications,
        user_name=user.name,
    )


async def start_session(
    user: User,
    topic_id: str | None,
    session_type: str,
    db: AsyncSession,
) -> StartSessionResponse:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    new_session = StudySession(
        user_id=user.id,
        topic_id=uuid.UUID(topic_id) if topic_id else None,
        session_type=session_type,
        start_time=now,
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return StartSessionResponse(session_id=str(new_session.id), started_at=now)


async def end_session(
    user: User,
    session_id: str,
    db: AsyncSession,
) -> EndSessionResponse:
    result = await db.exec(
        select(StudySession)
        .where(StudySession.id == uuid.UUID(session_id))
        .where(StudySession.user_id == user.id)
        .where(StudySession.end_time == None)  # noqa: E711
    )
    study_session = result.first()
    if not study_session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada ou já encerrada")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    duration = max(1, int((now - study_session.start_time).total_seconds() // 60))
    study_session.end_time = now
    study_session.duration_minutes = duration

    if study_session.topic_id:
        topic_result = await db.exec(
            select(Topic).where(Topic.id == study_session.topic_id)
        )
        topic = topic_result.first()
        if topic:
            sprint_result = await db.exec(
                select(WeeklySprint).where(WeeklySprint.id == topic.weekly_sprint_id)
            )
            sprint = sprint_result.first()
            if sprint:
                sprint.hours_completed = Decimal(str(  # type: ignore[assignment]
                    round(float(sprint.hours_completed or 0) + duration / 60.0, 1)
                ))
                db.add(sprint)

    db.add(study_session)
    await db.commit()

    hours_completed = round(duration / 60.0, 2)
    xp_earned = max(5, int(duration / 6))  # ~10 XP/hora

    # Streak e XP de gamificação
    try:
        from app.services.gamification_service import award_xp, update_streak
        await update_streak(str(user.id), db)
        await award_xp(str(user.id), "study_session", xp_earned, db, session_id)
    except Exception:
        pass

    return EndSessionResponse(
        session_id=session_id,
        duration_minutes=duration,
        hours_completed=hours_completed,
        xp_earned=xp_earned,
    )
