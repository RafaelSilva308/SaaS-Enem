"""
Engine de Gamificação — Stage 3.1

Responsabilidades:
  - award_xp()         : Concede XP com multiplicador de streak, detecta level-up
  - evaluate_badges()  : Avalia e desbloqueia badges após cada evento de XP
  - update_streak()    : Atualiza streak diário ao finalizar uma sessão de estudo
  - process_daily_streaks() : Cron de meia-noite — reseta streaks quebrados
  - get_my_gamification()   : Endpoint /gamification/me
  - get_leaderboard()       : Endpoint /leaderboard

Sistema de níveis (20 níveis, limiares progressivos):
  Nível 1 → 0 XP | Nível 5 → 800 | Nível 10 → 4000 | Nível 20 → 33000

Multiplicadores de streak:
  1–2 dias → ×1.0 | 3–6 → ×1.5 | 7–13 → ×2.0 | 14–29 → ×3.0 | 30+ → ×5.0
"""

import hashlib
import logging
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.data.badges import BADGES
from app.models.models import (
    Badge, Diagnostic, Essay, EssayAnalysis, ExamResult,
    PointHistory, Question, QuestionStat, StudyPlan, StudySession,
    Topic, User, UserBadge, UserPoint, UserStreak, WeeklySprint, utcnow,
)
from app.schemas.gamification import (
    AwardXPResult, BadgeOut, GamificationResponse, HeatmapDay,
    LeaderboardEntry, LeaderboardResponse, StreakOut, UserPointsOut,
)

logger = logging.getLogger(__name__)

# ── Limiares dos 20 níveis ─────────────────────────────────────────

LEVEL_THRESHOLDS: list[int] = [
    0,      # nível 1
    100,    # nível 2
    250,    # nível 3
    500,    # nível 4
    800,    # nível 5
    1_200,  # nível 6
    1_700,  # nível 7
    2_300,  # nível 8
    3_000,  # nível 9
    4_000,  # nível 10
    5_200,  # nível 11
    6_600,  # nível 12
    8_200,  # nível 13
    10_000, # nível 14
    12_500, # nível 15
    15_500, # nível 16
    19_000, # nível 17
    23_000, # nível 18
    27_500, # nível 19
    33_000, # nível 20 (máximo)
]
MAX_LEVEL = len(LEVEL_THRESHOLDS)


def _calc_level(total_xp: int) -> int:
    level = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if total_xp >= threshold:
            level = i + 1
    return min(level, MAX_LEVEL)


def _level_info(total_xp: int, level: int) -> UserPointsOut:
    xp_current = LEVEL_THRESHOLDS[level - 1]
    xp_next = LEVEL_THRESHOLDS[level] if level < MAX_LEVEL else LEVEL_THRESHOLDS[-1]
    is_max = level >= MAX_LEVEL
    if is_max:
        xp_progress = total_xp - xp_current
        xp_to_next = 0
        pct = 100
    else:
        xp_progress = total_xp - xp_current
        xp_range = xp_next - xp_current
        xp_to_next = xp_next - total_xp
        pct = min(100, int(xp_progress / xp_range * 100)) if xp_range > 0 else 100

    return UserPointsOut(
        total_points=total_xp,
        current_level=level,
        xp_for_current_level=xp_current,
        xp_for_next_level=xp_next,
        xp_progress=xp_progress,
        xp_to_next=max(0, xp_to_next),
        progress_percent=pct,
        is_max_level=is_max,
    )


def _streak_multiplier(streak: int) -> float:
    if streak >= 30: return 5.0
    if streak >= 14: return 3.0
    if streak >= 7:  return 2.0
    if streak >= 3:  return 1.5
    return 1.0


# ── Seed badges ────────────────────────────────────────────────────

async def _ensure_badges_seeded(db: AsyncSession) -> None:
    count_r = await db.exec(select(func.count()).select_from(Badge))  # type: ignore[arg-type]
    count = count_r.first() or 0
    if count >= len(BADGES):
        return
    for b in BADGES:
        db.add(Badge(
            name=b["name"],
            description=b["description"],
            icon_url=b["icon_url"],
            tier=b["tier"],
            condition_type=b["condition_type"],
            condition_value=b["condition_value"],
        ))
    await db.commit()


# ── Badge helpers ──────────────────────────────────────────────────

def _badge_to_out(badge: Badge, unlocked: bool, unlocked_at: datetime | None = None) -> BadgeOut:
    return BadgeOut(
        id=str(badge.id),
        name=badge.name,
        description=badge.description,
        icon=badge.icon_url,
        tier=badge.tier or "bronze",
        unlocked=unlocked,
        unlocked_at=unlocked_at,
    )


async def _check_condition(badge: Badge, user_id: uuid.UUID, db: AsyncSession) -> bool:
    """Verifica se a condição de um badge foi atingida pelo usuário."""
    ctype = badge.condition_type or ""
    cval = int(badge.condition_value or "0")
    uid = user_id

    if ctype == "diagnostic_completed":
        r = await db.exec(select(Diagnostic).where(Diagnostic.user_id == uid))
        return r.first() is not None

    if ctype == "plan_generated":
        r = await db.exec(select(StudyPlan).where(StudyPlan.user_id == uid))
        return r.first() is not None

    if ctype == "streak_days":
        r = await db.exec(select(UserStreak).where(UserStreak.user_id == uid))
        s = r.first()
        return (s.current_streak if s else 0) >= cval

    if ctype == "questions_answered":
        r = await db.exec(
            select(func.sum(QuestionStat.attempts))  # type: ignore[arg-type]
            .where(QuestionStat.user_id == uid)
        )
        total = r.first() or 0
        return int(total) >= cval

    if ctype == "questions_correct":
        r = await db.exec(
            select(func.sum(QuestionStat.correct))  # type: ignore[arg-type]
            .where(QuestionStat.user_id == uid)
        )
        total = r.first() or 0
        return int(total) >= cval

    if ctype == "essays_submitted":
        r = await db.exec(
            select(func.count()).select_from(Essay)  # type: ignore[arg-type]
            .where(Essay.user_id == uid)
            .where(Essay.status.in_(["submitted", "under_review", "reviewed"]))
        )
        count = r.first() or 0
        return int(count) >= cval

    if ctype == "exams_completed":
        r = await db.exec(
            select(func.count()).select_from(ExamResult)  # type: ignore[arg-type]
            .where(ExamResult.user_id == uid)
        )
        count = r.first() or 0
        return int(count) >= cval

    if ctype == "sprints_completed":
        plan_ids_r = await db.exec(select(StudyPlan.id).where(StudyPlan.user_id == uid))
        plan_ids = list(plan_ids_r.all())
        if not plan_ids:
            return False
        count_r = await db.exec(
            select(func.count()).select_from(WeeklySprint)  # type: ignore[arg-type]
            .where(WeeklySprint.study_plan_id.in_(plan_ids))  # type: ignore[arg-type]
            .where(WeeklySprint.status == "completed")
        )
        return int(count_r.first() or 0) >= cval

    if ctype == "level_reached":
        r = await db.exec(select(UserPoint).where(UserPoint.user_id == uid))
        up = r.first()
        return (up.current_level if up else 1) >= cval

    if ctype == "tri_above_700":
        r = await db.exec(
            select(ExamResult).where(ExamResult.user_id == uid)
        )
        for result in r.all():
            perf = result.performance_by_subject or {}
            for data in perf.values():
                if isinstance(data, dict) and int(data.get("tri_score", 0)) >= cval:
                    return True
        return False

    if ctype == "essay_score_above":
        essay_ids_r = await db.exec(select(Essay.id).where(Essay.user_id == uid))
        essay_ids = list(essay_ids_r.all())
        if not essay_ids:
            return False
        r = await db.exec(
            select(EssayAnalysis)
            .where(EssayAnalysis.essay_id.in_(essay_ids))  # type: ignore[arg-type]
            .where(EssayAnalysis.ai_score > cval)
        )
        return r.first() is not None

    if ctype.startswith("subject_accuracy_"):
        subj = ctype[len("subject_accuracy_"):]
        q_ids_r = await db.exec(select(Question.id).where(Question.subject == subj))
        q_ids = list(q_ids_r.all())
        if not q_ids:
            return False
        stats_r = await db.exec(
            select(QuestionStat)
            .where(QuestionStat.user_id == uid)
            .where(QuestionStat.question_id.in_(q_ids))  # type: ignore[arg-type]
        )
        stats = stats_r.all()
        total_att = sum(s.attempts for s in stats)
        total_cor = sum(s.correct for s in stats)
        return total_att >= 10 and (total_cor / total_att * 100) >= cval

    if ctype == "badges_count":
        r = await db.exec(
            select(func.count()).select_from(UserBadge)  # type: ignore[arg-type]
            .where(UserBadge.user_id == uid)
        )
        return int(r.first() or 0) >= cval

    if ctype == "total_xp":
        r = await db.exec(select(UserPoint).where(UserPoint.user_id == uid))
        up = r.first()
        return (up.total_points if up else 0) >= cval

    return False


# ── Evaluate badges ────────────────────────────────────────────────

async def evaluate_badges(user_id: uuid.UUID, db: AsyncSession) -> list[BadgeOut]:
    """
    Verifica todas as badges ainda não desbloqueadas e as concede se a condição for atingida.
    Retorna lista de badges recém-desbloqueadas (pode ser vazia).
    """
    await _ensure_badges_seeded(db)

    # Otimização: se já tem o máximo de badges, sai imediatamente
    unlocked_r = await db.exec(
        select(UserBadge).where(UserBadge.user_id == user_id)
    )
    unlocked_map = {ub.badge_id: ub for ub in unlocked_r.all()}

    if len(unlocked_map) >= len(BADGES):
        return []

    all_badges_r = await db.exec(select(Badge))
    all_badges = all_badges_r.all()

    newly_unlocked: list[BadgeOut] = []
    now = utcnow()

    for badge in all_badges:
        if badge.id in unlocked_map:
            continue  # já desbloqueado

        if await _check_condition(badge, user_id, db):
            ub = UserBadge(user_id=user_id, badge_id=badge.id, unlocked_at=now)
            db.add(ub)
            newly_unlocked.append(_badge_to_out(badge, unlocked=True, unlocked_at=now))

    if newly_unlocked:
        await db.commit()

    return newly_unlocked


# ── Award XP ───────────────────────────────────────────────────────

async def award_xp(
    user_id: str,
    action_type: str,
    base_xp: int,
    db: AsyncSession,
    related_entity_id: str | None = None,
) -> AwardXPResult:
    """
    Concede XP ao usuário.
    Aplica multiplicador de streak, detecta level-up, avalia badges.
    É seguro chamar de qualquer serviço — falhas internas são logadas e não propagadas.
    """
    uid = uuid.UUID(user_id)

    # Multiplicador de streak
    streak_r = await db.exec(select(UserStreak).where(UserStreak.user_id == uid))
    streak_obj = streak_r.first()
    multiplier = _streak_multiplier(streak_obj.current_streak if streak_obj else 0)
    final_xp = max(1, round(base_xp * multiplier))

    # Get or create UserPoint
    up_r = await db.exec(select(UserPoint).where(UserPoint.user_id == uid))
    up = up_r.first()

    if not up:
        up = UserPoint(
            user_id=uid,
            total_points=0,
            current_level=1,
            experience_points=0,
            lifetime_points=0,
        )
        db.add(up)
        await db.flush()

    old_level = up.current_level
    up.total_points    += final_xp
    up.experience_points += final_xp
    up.lifetime_points  += final_xp
    new_level = _calc_level(up.total_points)
    up.current_level = new_level
    db.add(up)

    # Histórico
    db.add(PointHistory(
        user_id=uid,
        action_type=action_type,
        points_earned=final_xp,
        related_entity_id=uuid.UUID(related_entity_id) if related_entity_id else None,
        description=f"XP por {action_type} (×{multiplier})",
    ))

    await db.commit()
    await db.refresh(up)

    # Avaliar badges após XP
    new_badges = await evaluate_badges(uid, db)

    # Notificações de level-up e badge
    try:
        from app.services.notifications_service import create_notification
        from app.schemas.notifications import NotifType
        if new_level > old_level:
            await create_notification(
                uid, NotifType.LEVEL_UP,
                f"Você alcançou o nível {new_level}!",
                f"Parabéns! Continue estudando para avançar ainda mais.",
                db,
            )
        for badge in new_badges:
            await create_notification(
                uid, NotifType.BADGE_EARNED,
                f"Badge desbloqueado: {badge.name}",
                badge.description or "Nova conquista desbloqueada!",
                db,
            )
    except Exception:
        pass

    return AwardXPResult(
        xp_earned=final_xp,
        total_points=up.total_points,
        current_level=new_level,
        leveled_up=new_level > old_level,
        new_badges=new_badges,
    )


# ── Streak ─────────────────────────────────────────────────────────

async def update_streak(user_id: str, db: AsyncSession) -> None:
    """
    Atualiza o streak diário do usuário.
    Deve ser chamado quando uma sessão de estudo é encerrada.
    """
    uid = uuid.UUID(user_id)
    today = date.today()

    streak_r = await db.exec(select(UserStreak).where(UserStreak.user_id == uid))
    streak = streak_r.first()

    if not streak:
        streak = UserStreak(
            user_id=uid,
            current_streak=1,
            longest_streak=1,
            last_studied_date=today,
            streak_broken_count=0,
        )
        db.add(streak)
        await db.commit()
        return

    if streak.last_studied_date == today:
        return  # já contabilizado hoje

    yesterday = today - timedelta(days=1)
    if streak.last_studied_date == yesterday:
        streak.current_streak += 1
    else:
        # Streak quebrado
        if streak.current_streak > 0:
            streak.streak_broken_count += 1
        streak.current_streak = 1  # começa novo streak

    streak.last_studied_date = today
    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    db.add(streak)
    await db.commit()


async def process_daily_streaks(db: AsyncSession) -> int:
    """
    Cron de meia-noite: reseta streaks de usuários que não estudaram ontem.
    Retorna número de streaks resetados.
    """
    yesterday = date.today() - timedelta(days=1)
    streaks_r = await db.exec(
        select(UserStreak)
        .where(UserStreak.current_streak > 0)
        .where(UserStreak.last_studied_date < yesterday)
    )
    broken = 0
    for streak in streaks_r.all():
        streak.streak_broken_count += 1
        streak.current_streak = 0
        db.add(streak)
        broken += 1

    if broken:
        await db.commit()

    return broken


# ── Heatmap ────────────────────────────────────────────────────────

async def _build_heatmap(user_id: uuid.UUID, db: AsyncSession) -> list[HeatmapDay]:
    """Retorna os últimos 84 dias (12 semanas) de atividade de estudo."""
    today = datetime.now(timezone.utc).replace(tzinfo=None).replace(hour=0, minute=0, second=0, microsecond=0)
    period_start = today - timedelta(days=83)

    sessions_r = await db.exec(
        select(StudySession)
        .where(StudySession.user_id == user_id)
        .where(StudySession.start_time >= period_start)
        .where(StudySession.end_time != None)  # noqa: E711
    )
    sessions = sessions_r.all()

    # Agrupar por data
    hours_by_date: dict[str, float] = {}
    for s in sessions:
        day_str = s.start_time.strftime("%Y-%m-%d")
        hours_by_date[day_str] = hours_by_date.get(day_str, 0) + (s.duration_minutes or 0) / 60

    days: list[HeatmapDay] = []
    for i in range(84):
        d = today - timedelta(days=83 - i)
        d_str = d.strftime("%Y-%m-%d")
        hours = round(hours_by_date.get(d_str, 0), 2)
        intensity = 0 if hours == 0 else (1 if hours < 1 else (2 if hours < 2 else (3 if hours < 3 else 4)))
        days.append(HeatmapDay(date=d_str, hours=hours, intensity=intensity))

    return days


# ── GET /gamification/me ───────────────────────────────────────────

async def get_my_gamification(user: User, db: AsyncSession) -> GamificationResponse:
    await _ensure_badges_seeded(db)
    uid = user.id

    # Pontos e nível
    up_r = await db.exec(select(UserPoint).where(UserPoint.user_id == uid))
    up = up_r.first()
    total_xp = up.total_points if up else 0
    level = _calc_level(total_xp)
    points_out = _level_info(total_xp, level)

    # Streak
    streak_r = await db.exec(select(UserStreak).where(UserStreak.user_id == uid))
    streak = streak_r.first()
    streak_out = StreakOut(
        current_streak=streak.current_streak if streak else 0,
        longest_streak=streak.longest_streak if streak else 0,
        last_studied_date=streak.last_studied_date if streak else None,
        streak_broken_count=streak.streak_broken_count if streak else 0,
    )

    # Badges (desbloqueados + catálogo completo)
    all_badges_r = await db.exec(select(Badge))
    all_badges = all_badges_r.all()

    unlocked_r = await db.exec(select(UserBadge).where(UserBadge.user_id == uid))
    unlocked_map = {ub.badge_id: ub for ub in unlocked_r.all()}

    badges_out = [
        _badge_to_out(
            b,
            unlocked=b.id in unlocked_map,
            unlocked_at=unlocked_map[b.id].unlocked_at if b.id in unlocked_map else None,
        )
        for b in all_badges
    ]

    # Heatmap
    heatmap = await _build_heatmap(uid, db)

    return GamificationResponse(
        points=points_out,
        streak=streak_out,
        badges=badges_out,
        badges_count=len(unlocked_map),
        heatmap=heatmap,
    )


# ── GET /leaderboard ───────────────────────────────────────────────

async def get_leaderboard(user: User, db: AsyncSession) -> LeaderboardResponse:
    # All-time: top 50 por total_points
    all_time_r = await db.exec(
        select(UserPoint)
        .order_by(UserPoint.total_points.desc())  # type: ignore[arg-type]
        .limit(50)
    )
    all_time_ups = all_time_r.all()

    # Weekly: somar XP dos últimos 7 dias por usuário
    week_start = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7)
    weekly_history_r = await db.exec(
        select(PointHistory.user_id, func.sum(PointHistory.points_earned).label("weekly_xp"))  # type: ignore[arg-type]
        .where(PointHistory.created_at >= week_start)
        .group_by(PointHistory.user_id)
        .order_by(func.sum(PointHistory.points_earned).desc())  # type: ignore[arg-type]
        .limit(50)
    )
    weekly_rows = weekly_history_r.all()

    def _anonymize(uid: uuid.UUID, name: str) -> str:
        # Usa hash do UUID para gerar sufixo numérico consistente
        h = int(hashlib.md5(str(uid).encode()).hexdigest(), 16) % 9999
        parts = name.strip().split()
        first = parts[0] if parts else "Estudante"
        return f"{first} #{h:04d}"

    # Mapear user_ids para nomes e streaks
    all_user_ids = list({up.user_id for up in all_time_ups} | {r[0] for r in weekly_rows})
    users_r = await db.exec(select(User).where(User.id.in_(all_user_ids)))  # type: ignore[arg-type]
    user_name_map = {u.id: u.name for u in users_r.all()}

    streaks_r = await db.exec(select(UserStreak).where(UserStreak.user_id.in_(all_user_ids)))  # type: ignore[arg-type]
    streak_map = {s.user_id: s.current_streak for s in streaks_r.all()}

    # Mapa XP semanais para lookup rápido
    weekly_xp_map: dict[uuid.UUID, int] = {r[0]: int(r[1]) for r in weekly_rows}

    # Ordenar weekly por XP semanal
    weekly_ordered = sorted(weekly_xp_map.items(), key=lambda x: -x[1])[:50]

    def _make_weekly_entries() -> list[LeaderboardEntry]:
        entries = []
        for rank, (uid, xp) in enumerate(weekly_ordered, start=1):
            up_item = next((up for up in all_time_ups if up.user_id == uid), None)
            entries.append(LeaderboardEntry(
                rank=rank,
                display_name=_anonymize(uid, user_name_map.get(uid, "Estudante")),
                level=up_item.current_level if up_item else 1,
                total_points=xp,
                current_streak=streak_map.get(uid, 0),
            ))
        return entries

    def _make_alltime_entries() -> list[LeaderboardEntry]:
        return [
            LeaderboardEntry(
                rank=i + 1,
                display_name=_anonymize(up.user_id, user_name_map.get(up.user_id, "Estudante")),
                level=up.current_level,
                total_points=up.total_points,
                current_streak=streak_map.get(up.user_id, 0),
            )
            for i, up in enumerate(all_time_ups)
        ]

    weekly_entries = _make_weekly_entries()
    alltime_entries = _make_alltime_entries()

    # Rank do usuário atual
    user_rank_weekly = next(
        (e.rank for e in weekly_entries if _anonymize(user.id, user.name) == e.display_name), None
    )
    user_rank_alltime = next(
        (e.rank for e in alltime_entries if _anonymize(user.id, user.name) == e.display_name), None
    )

    return LeaderboardResponse(
        weekly=weekly_entries,
        all_time=alltime_entries,
        user_rank_weekly=user_rank_weekly,
        user_rank_alltime=user_rank_alltime,
    )
