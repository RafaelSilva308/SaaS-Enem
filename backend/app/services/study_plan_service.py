"""
Serviço de Plano de Estudos.

Algoritmo de geração:
1. Calcular horas disponíveis até o ENEM (2 nov 2026)
2. Distribuir por disciplina usando pesos de fraqueza do diagnóstico
   - fraco (<60) = 40%  |  moderado (60-80) = 35%  |  forte (>80) = 25%
3. Selecionar tópicos do currículo por disciplina (order: critical → high → medium → low)
4. Criar weekly_sprints (janelas de 7 dias) e distribuir tópicos por sprint
5. Para cada sprint, atribuir tópicos a dias disponíveis
6. Adicionar sessão de revisão 7 dias após cada tópico de teoria concluído
"""

import uuid
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.data.curriculum import (
    CURRICULUM,
    DAY_NAMES,
    ENEM_DATE_2026,
    PRIORITY_ORDER,
    SUBJECT_LABELS,
    CurriculumTopic,
)
from app.models.models import (
    Diagnostic, LearningProfile, StudyPlan, StudySession,
    Topic, UserPoint, WeeklySprint, utcnow,
)
from app.schemas.study_plan import (
    AdjustPlanRequest,
    CompleteTopicResponse,
    SprintSummary,
    StudyPlanResponse,
    SubjectProgress,
    TopicResponse,
)

ENEM_DATE = date(*ENEM_DATE_2026)

SUBJECT_COLORS = {
    "linguagens": "#2563eb",
    "matematica": "#10b981",
    "cn": "#7c3aed",
    "ch": "#f59e0b",
}

WEAKNESS_WEIGHTS = {"weak": 0.40, "moderate": 0.35, "strong": 0.25}


def _get_level(score: int) -> str:
    if score < 60:
        return "weak"
    if score < 80:
        return "moderate"
    return "strong"


def _count_study_days(start: date, end: date, available: list[str]) -> int:
    count = 0
    d = start
    while d < end:
        if DAY_NAMES[d.weekday()] in available:
            count += 1
        d += timedelta(days=1)
    return count


def _sprint_study_days(sprint_start: date, sprint_end: date, available: list[str]) -> list[date]:
    days = []
    d = sprint_start
    while d <= sprint_end and d < ENEM_DATE:
        if DAY_NAMES[d.weekday()] in available:
            days.append(d)
        d += timedelta(days=1)
    return days


# ── Serialization helpers ──────────────────────────────────────────

def _topic_to_response(t: Topic) -> TopicResponse:
    return TopicResponse(
        id=str(t.id),
        name=t.name,
        subject=t.subject or "",
        subject_label=SUBJECT_LABELS.get(t.subject or "", t.subject or ""),
        hours_allocated=float(t.hours_allocated or 0),
        type=t.type or "theory",
        priority=t.priority or "medium",
        scheduled_days=t.scheduled_days or [],
        is_completed=t.is_completed,
        completed_at=t.completed_at.isoformat() if t.completed_at else None,
    )


def _sprint_to_response(sprint: WeeklySprint, topics: list[Topic]) -> SprintSummary:
    topic_responses = [_topic_to_response(t) for t in topics]
    total = float(sprint.total_hours_allocated or 0)
    done = float(sprint.hours_completed or 0)
    pct = int((done / total * 100)) if total > 0 else 0
    return SprintSummary(
        id=str(sprint.id),
        week_number=sprint.week_number,
        start_date=sprint.start_date.isoformat(),
        end_date=sprint.end_date.isoformat(),
        theme=sprint.theme,
        total_hours_allocated=total,
        hours_completed=done,
        status=sprint.status,
        progress_percentage=pct,
        topics=topic_responses,
    )


# ── Plan generation algorithm ──────────────────────────────────────

def _build_topic_queue(
    subject: str,
    hours_budget: float,
    daily_hours: float,
) -> list[dict]:
    """Seleciona e ordena tópicos do currículo para uma disciplina até o budget de horas."""
    topics = sorted(CURRICULUM[subject], key=lambda t: PRIORITY_ORDER[t["priority"]])
    queue: list[dict] = []
    remaining = hours_budget

    for t in topics:
        if remaining <= 0:
            break
        hours = min(t["hours"], remaining)
        queue.append({
            "name": t["name"],
            "subject": subject,
            "hours": hours,
            "priority": t["priority"],
            "type": "theory",
        })
        remaining -= hours

        # Sessão de prática (50% das horas de teoria, para tópicos >= 3h)
        if t["hours"] >= 3 and remaining > 0:
            practice_hours = min(t["hours"] * 0.5, remaining)
            queue.append({
                "name": f"Prática — {t['name']}",
                "subject": subject,
                "hours": practice_hours,
                "priority": t["priority"],
                "type": "practice",
            })
            remaining -= practice_hours

    return queue


def _distribute_topics_to_sprints(
    all_topics: list[dict],
    sprints_data: list[dict],  # [{"start": date, "end": date, "study_days": [date, ...], "hours": float}]
) -> list[list[dict]]:
    """Distribui a fila de tópicos entre os sprints, respeitando as horas alocadas."""
    topic_queue = deepcopy(all_topics)
    sprints_topics: list[list[dict]] = [[] for _ in sprints_data]

    for i, sprint in enumerate(sprints_data):
        budget = sprint["hours"]
        study_days = sprint["study_days"]

        while topic_queue and budget > 0:
            t = topic_queue[0]
            hours_for_this_sprint = min(t["hours"], budget)

            # Distribuir dias do tópico dentro do sprint
            hours_per_day = sprint["hours"] / max(len(study_days), 1)
            days_needed = max(1, round(hours_for_this_sprint / hours_per_day))
            assigned_days = [DAY_NAMES[d.weekday()] for d in study_days[:days_needed]]

            sprints_topics[i].append({
                **t,
                "hours": hours_for_this_sprint,
                "scheduled_days": assigned_days,
            })
            budget -= hours_for_this_sprint

            if hours_for_this_sprint >= t["hours"]:
                topic_queue.pop(0)
            else:
                topic_queue[0]["hours"] -= hours_for_this_sprint

    return sprints_topics


async def generate_plan(
    user_id: str,
    force: bool,
    session: AsyncSession,
) -> StudyPlanResponse:
    uid = uuid.UUID(user_id)

    # Verificar se já existe plano ativo
    if not force:
        existing = await session.exec(
            select(StudyPlan).where(StudyPlan.user_id == uid).where(StudyPlan.status == "active")
        )
        if existing.first():
            return await get_my_plan(user_id, session)

    # Buscar diagnóstico e perfil
    diag_result = await session.exec(
        select(Diagnostic).where(Diagnostic.user_id == uid).order_by(Diagnostic.completed_at.desc())  # type: ignore
    )
    diag = diag_result.first()
    if not diag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete o diagnóstico antes de gerar o plano de estudos.",
        )

    lp_result = await session.exec(select(LearningProfile).where(LearningProfile.user_id == uid))
    lp = lp_result.first()
    if not lp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Perfil de aprendizado não encontrado.",
        )

    today = date.today()
    if today >= ENEM_DATE:
        raise HTTPException(status_code=400, detail="O ENEM já passou.")

    available_days: list[str] = lp.available_days or ["seg", "ter", "qua", "qui", "sex"]
    daily_hours = float(lp.daily_hours_goal or 2.0)

    # Total de horas disponíveis
    total_study_days = _count_study_days(today, ENEM_DATE, available_days)
    total_hours = total_study_days * daily_hours

    # Distribuição por disciplina
    scores = {
        "linguagens": diag.linguagens_score or 50,
        "matematica": diag.matematica_score or 50,
        "cn": diag.cn_score or 50,
        "ch": diag.ch_score or 50,
    }
    weights = {s: WEAKNESS_WEIGHTS[_get_level(v)] for s, v in scores.items()}
    total_w = sum(weights.values())
    subject_hours = {s: (weights[s] / total_w) * total_hours for s in scores}

    # Construir fila de tópicos
    all_topics: list[dict] = []
    for subj, hours in subject_hours.items():
        all_topics.extend(_build_topic_queue(subj, hours, daily_hours))

    # Criar sprints
    sprints_data: list[dict] = []
    sprint_start = today
    while sprint_start < ENEM_DATE:
        sprint_end = min(sprint_start + timedelta(days=6), ENEM_DATE - timedelta(days=1))
        study_days = _sprint_study_days(sprint_start, sprint_end, available_days)
        sprint_hours = len(study_days) * daily_hours
        sprints_data.append({
            "start": sprint_start,
            "end": sprint_end,
            "study_days": study_days,
            "hours": sprint_hours,
        })
        sprint_start += timedelta(days=7)

    weeks_total = len(sprints_data)
    # Inserir semana de revisão intensiva nas últimas 2 semanas
    for sd in sprints_data[-2:]:
        sd["hours"] *= 1.25  # 25% mais horas nas últimas 2 semanas

    # Distribuir tópicos entre sprints
    sprints_topics = _distribute_topics_to_sprints(all_topics, sprints_data)

    # Persistir no banco
    now = utcnow()

    # Desativar planos anteriores
    old_plans = await session.exec(
        select(StudyPlan).where(StudyPlan.user_id == uid).where(StudyPlan.status == "active")
    )
    for old in old_plans.all():
        old.status = "replaced"
        session.add(old)

    plan = StudyPlan(
        id=uuid.uuid4(),
        user_id=uid,
        diagnostic_id=diag.id,
        total_hours_available=int(total_hours),
        daily_hours_goal=daily_hours,  # type: ignore[arg-type]
        weeks_remaining=weeks_total,
        status="active",
    )
    session.add(plan)
    await session.flush()

    # Tema do sprint: disciplina dominante naquela semana
    def _sprint_theme(topics: list[dict]) -> str:
        if not topics:
            return "Revisão geral"
        subj_hours: dict[str, float] = {}
        for t in topics:
            subj_hours[t["subject"]] = subj_hours.get(t["subject"], 0) + t["hours"]
        dominant = max(subj_hours, key=lambda k: subj_hours[k])
        top_topic = next((t["name"] for t in topics if t["subject"] == dominant and t["type"] == "theory"), None)
        return top_topic or SUBJECT_LABELS[dominant]

    for i, (sd, topics) in enumerate(zip(sprints_data, sprints_topics)):
        sprint = WeeklySprint(
            id=uuid.uuid4(),
            study_plan_id=plan.id,
            week_number=i + 1,
            start_date=sd["start"],
            end_date=sd["end"],
            theme=_sprint_theme(topics),
            total_hours_allocated=round(sd["hours"], 1),  # type: ignore[arg-type]
            hours_completed=0.0,  # type: ignore[arg-type]
            status="not_started",
        )
        session.add(sprint)
        await session.flush()

        # Status do sprint
        if sd["end"] >= today >= sd["start"]:
            sprint.status = "in_progress"
            session.add(sprint)

        for t in topics:
            topic = Topic(
                id=uuid.uuid4(),
                weekly_sprint_id=sprint.id,
                name=t["name"],
                subject=t["subject"],
                hours_allocated=round(t["hours"], 1),  # type: ignore[arg-type]
                type=t["type"],
                priority=t["priority"],
                scheduled_days=t["scheduled_days"],
                is_completed=False,
            )
            session.add(topic)

    await session.commit()
    return await get_my_plan(user_id, session)


# ── Read plan ──────────────────────────────────────────────────────

async def get_my_plan(user_id: str, session: AsyncSession) -> StudyPlanResponse:
    uid = uuid.UUID(user_id)

    plan_result = await session.exec(
        select(StudyPlan).where(StudyPlan.user_id == uid).where(StudyPlan.status == "active")
    )
    plan = plan_result.first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum plano ativo. Gere um plano primeiro.",
        )

    sprints_result = await session.exec(
        select(WeeklySprint)
        .where(WeeklySprint.study_plan_id == plan.id)
        .order_by(WeeklySprint.week_number)  # type: ignore
    )
    sprints = sprints_result.all()

    today = date.today()
    all_sprint_responses: list[SprintSummary] = []
    current_sprint: SprintSummary | None = None
    next_sprint: SprintSummary | None = None

    total_topics = 0
    completed_topics = 0
    subject_data: dict[str, dict] = {
        s: {"completed": 0, "total": 0, "hours_done": 0.0, "hours_total": 0.0}
        for s in ["linguagens", "matematica", "cn", "ch"]
    }

    for sprint in sprints:
        topics_result = await session.exec(
            select(Topic).where(Topic.weekly_sprint_id == sprint.id)
        )
        topics = topics_result.all()

        for t in topics:
            subj = t.subject or "linguagens"
            if subj in subject_data:
                subject_data[subj]["total"] += 1
                subject_data[subj]["hours_total"] += float(t.hours_allocated or 0)
                if t.is_completed:
                    subject_data[subj]["completed"] += 1
                    subject_data[subj]["hours_done"] += float(t.hours_allocated or 0)
            total_topics += 1
            if t.is_completed:
                completed_topics += 1

        sr = _sprint_to_response(sprint, list(topics))
        all_sprint_responses.append(sr)

        if sprint.start_date <= today <= sprint.end_date:
            current_sprint = sr
        elif sprint.start_date > today and next_sprint is None:
            next_sprint = sr

    overall = int(completed_topics / total_topics * 100) if total_topics > 0 else 0

    weeks_left = sum(1 for s in sprints if s.start_date > today)

    subjects_progress = [
        SubjectProgress(
            subject=s,
            label=SUBJECT_LABELS[s],
            color=SUBJECT_COLORS[s],
            topics_completed=subject_data[s]["completed"],
            topics_total=subject_data[s]["total"],
            hours_completed=round(subject_data[s]["hours_done"], 1),
            hours_total=round(subject_data[s]["hours_total"], 1),
            percentage=int(subject_data[s]["completed"] / subject_data[s]["total"] * 100)
            if subject_data[s]["total"] > 0 else 0,
        )
        for s in ["linguagens", "matematica", "cn", "ch"]
    ]

    return StudyPlanResponse(
        plan_id=str(plan.id),
        status=plan.status,
        daily_hours_goal=float(plan.daily_hours_goal or 2.0),
        weeks_remaining=weeks_left,
        total_weeks=len(sprints),
        enem_date=ENEM_DATE.isoformat(),
        overall_progress=overall,
        current_sprint=current_sprint or (all_sprint_responses[0] if all_sprint_responses else None),
        next_sprint=next_sprint,
        subjects_progress=subjects_progress,
        all_sprints=all_sprint_responses,
    )


# ── Adjust plan ────────────────────────────────────────────────────

async def adjust_plan(plan_id: str, user_id: str, data: AdjustPlanRequest, session: AsyncSession) -> StudyPlanResponse:
    # Atualizar learning profile e regenerar
    uid = uuid.UUID(user_id)
    lp_result = await session.exec(select(LearningProfile).where(LearningProfile.user_id == uid))
    lp = lp_result.first()
    if lp:
        lp.daily_hours_goal = data.daily_hours_goal  # type: ignore[assignment]
        lp.available_days = data.available_days
        session.add(lp)
        await session.commit()

    return await generate_plan(user_id, force=True, session=session)


# ── Complete topic ──────────────────────────────────────────────────

async def complete_topic(topic_id: str, user_id: str, session: AsyncSession) -> CompleteTopicResponse:
    uid = uuid.UUID(user_id)
    t_result = await session.exec(select(Topic).where(Topic.id == uuid.UUID(topic_id)))
    topic = t_result.first()
    if not topic:
        raise HTTPException(status_code=404, detail="Tópico não encontrado")

    topic.is_completed = not topic.is_completed
    topic.completed_at = utcnow() if topic.is_completed else None
    session.add(topic)

    # Atualizar horas concluídas no sprint
    sprint_result = await session.exec(select(WeeklySprint).where(WeeklySprint.id == topic.weekly_sprint_id))
    sprint = sprint_result.first()
    if sprint:
        if topic.is_completed:
            sprint.hours_completed = (float(sprint.hours_completed or 0) + float(topic.hours_allocated or 0))  # type: ignore[assignment]
        else:
            sprint.hours_completed = max(0.0, float(sprint.hours_completed or 0) - float(topic.hours_allocated or 0))  # type: ignore[assignment]

        # Verificar se sprint foi concluído
        topics_in_sprint = await session.exec(select(Topic).where(Topic.weekly_sprint_id == sprint.id))
        all_sprint_topics = topics_in_sprint.all()
        if all(t.is_completed for t in all_sprint_topics):
            sprint.status = "completed"
        elif float(sprint.hours_completed or 0) > 0:
            sprint.status = "in_progress"
        session.add(sprint)

    await session.commit()

    # XP (será integrado com gamificação no Stage 3.1)
    xp = 15 if topic.is_completed else 0

    # Calcular progresso do sprint
    sprint_pct = 0
    if sprint:
        total = float(sprint.total_hours_allocated or 1)
        done = float(sprint.hours_completed or 0)
        sprint_pct = int(min(100, done / total * 100))

    return CompleteTopicResponse(
        topic_id=topic_id,
        is_completed=topic.is_completed,
        xp_earned=xp,
        sprint_progress=sprint_pct,
    )
