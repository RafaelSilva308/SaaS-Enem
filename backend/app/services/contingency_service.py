"""
Engine de Plano de Contingência.

Detecta atraso comparando horas esperadas vs realizadas e oferece:
  1. get_status()           — health score + severity do plano ativo
  2. regenerate()           — reordena tópicos restantes por frequência ENEM + fraqueza,
                              comprime sprints e marca is_contingency=True
  3. get_turbo_session()    — 5 questões do tema crítico mais fraco (mini-sessão de 15min)
  4. run_delay_cron()       — varre todos os planos ativos e envia notificação a quem atrasou
                              (deve ser chamado por cron noturno às 00h Brasília)

Severity:
  ok       — atraso < 20%
  leve     — 20% ≤ atraso < 30%
  moderado — 30% ≤ atraso < 50%
  severo   — atraso ≥ 50%
"""

import uuid
import logging
from copy import deepcopy
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.data.curriculum import CURRICULUM, DAY_NAMES, ENEM_DATE_2026, PRIORITY_ORDER, SUBJECT_LABELS
from app.db.engine import AsyncSessionLocal
from app.models.models import (
    Diagnostic, LearningProfile, Question, QuestionOption,
    StudyPlan, Topic, WeeklySprint, utcnow,
)
from app.schemas.contingency import ContingencyStatusOut, TurboOptionOut, TurboQuestionOut, TurboSessionOut

logger = logging.getLogger(__name__)

ENEM_DATE = date(*ENEM_DATE_2026)

PRIORITY_SCORE = {"critical": 4, "high": 3, "medium": 2, "low": 1}


# ── Internal helpers ───────────────────────────────────────────────

async def _get_active_plan(uid: uuid.UUID, session: AsyncSession) -> StudyPlan | None:
    r = await session.exec(
        select(StudyPlan)
        .where(StudyPlan.user_id == uid)
        .where(StudyPlan.status == "active")
    )
    return r.first()


async def _get_sprints(plan_id: uuid.UUID, session: AsyncSession) -> list[WeeklySprint]:
    r = await session.exec(
        select(WeeklySprint)
        .where(WeeklySprint.study_plan_id == plan_id)
        .order_by(WeeklySprint.week_number)  # type: ignore[arg-type]
    )
    return list(r.all())


async def _get_sprint_topics(sprint_id: uuid.UUID, session: AsyncSession) -> list[Topic]:
    r = await session.exec(select(Topic).where(Topic.weekly_sprint_id == sprint_id))
    return list(r.all())


async def _find_weakest_subject(plan_id: uuid.UUID, session: AsyncSession) -> str | None:
    """Retorna a disciplina com mais tópicos críticos/altos incompletos."""
    sprints = await _get_sprints(plan_id, session)
    scores: dict[str, int] = {}
    for sprint in sprints:
        topics = await _get_sprint_topics(sprint.id, session)
        for t in topics:
            if t.is_completed:
                continue
            subj = t.subject or "linguagens"
            scores[subj] = scores.get(subj, 0) + PRIORITY_SCORE.get(t.priority or "medium", 2)
    return max(scores, key=lambda s: scores[s]) if scores else None


# ── Status ─────────────────────────────────────────────────────────

async def get_status(user_id: str, session: AsyncSession) -> ContingencyStatusOut:
    uid = uuid.UUID(user_id)
    plan = await _get_active_plan(uid, session)
    if not plan:
        return ContingencyStatusOut(
            plan_id="",
            is_contingency=False,
            delay_detected=False,
            severity="ok",
            expected_hours=0.0,
            actual_hours=0.0,
            hours_behind=0.0,
            delay_percent=0.0,
            days_behind=0,
            health_score=100,
            weakest_subject=None,
        )

    today = date.today()
    sprints = await _get_sprints(plan.id, session)

    expected = 0.0
    actual = 0.0

    for sprint in sprints:
        if sprint.start_date > today:
            break
        alloc = float(sprint.total_hours_allocated or 0)
        if sprint.end_date < today:
            expected += alloc
        else:
            total_days = max(1, (sprint.end_date - sprint.start_date).days + 1)
            elapsed = (today - sprint.start_date).days + 1
            expected += alloc * (elapsed / total_days)
        actual += float(sprint.hours_completed or 0)

    hours_behind = max(0.0, expected - actual)
    delay_pct = (hours_behind / expected * 100) if expected > 0 else 0.0

    if delay_pct < 20:
        severity = "ok"
    elif delay_pct < 30:
        severity = "leve"
    elif delay_pct < 50:
        severity = "moderado"
    else:
        severity = "severo"

    daily_goal = float(plan.daily_hours_goal or 2.0)
    days_behind = int(hours_behind / daily_goal) if daily_goal > 0 else 0
    health_score = max(0, min(100, round(100 - delay_pct)))

    weakest = await _find_weakest_subject(plan.id, session)

    return ContingencyStatusOut(
        plan_id=str(plan.id),
        is_contingency=plan.is_contingency,
        delay_detected=(severity != "ok"),
        severity=severity,
        expected_hours=round(expected, 1),
        actual_hours=round(actual, 1),
        hours_behind=round(hours_behind, 1),
        delay_percent=round(delay_pct, 1),
        days_behind=days_behind,
        health_score=health_score,
        weakest_subject=weakest,
    )


# ── Regenerate ─────────────────────────────────────────────────────

async def regenerate(user_id: str, session: AsyncSession):
    """
    Reordena os tópicos incompletos restantes por frequência ENEM + fraqueza,
    comprime os sprints futuros e marca o plano como contingência.
    Retorna StudyPlanResponse.
    """
    from app.services.study_plan_service import get_my_plan, _sprint_study_days, _distribute_topics_to_sprints

    uid = uuid.UUID(user_id)
    plan = await _get_active_plan(uid, session)
    if not plan:
        raise HTTPException(status_code=404, detail="Nenhum plano ativo.")

    today = date.today()
    if today >= ENEM_DATE:
        raise HTTPException(status_code=400, detail="O ENEM já passou.")

    lp_r = await session.exec(select(LearningProfile).where(LearningProfile.user_id == uid))
    lp = lp_r.first()
    available_days: list[str] = (lp.available_days if lp else None) or ["seg", "ter", "qua", "qui", "sex"]
    daily_hours = float(lp.daily_hours_goal if lp else 2.0)

    # Fraquezas do diagnóstico (para boostar disciplinas fracas)
    diag_r = await session.exec(
        select(Diagnostic).where(Diagnostic.user_id == uid)
        .order_by(Diagnostic.completed_at.desc())  # type: ignore[arg-type]
    )
    diag = diag_r.first()
    weakness_subjects: set[str] = set()
    if diag:
        scores = {
            "linguagens": diag.linguagens_score or 50,
            "matematica": diag.matematica_score or 50,
            "cn": diag.cn_score or 50,
            "ch": diag.ch_score or 50,
        }
        weakness_subjects = {s for s, v in scores.items() if v < 60}

    # Coletar tópicos incompletos de sprints que ainda não terminaram
    sprints = await _get_sprints(plan.id, session)
    incomplete_topics: list[dict] = []
    sprint_ids_to_delete: list[uuid.UUID] = []

    for sprint in sprints:
        if sprint.end_date < today:
            continue  # sprints passados — não mexer
        topics = await _get_sprint_topics(sprint.id, session)
        for t in topics:
            if not t.is_completed:
                # Score de prioridade: ENEM freq + bônus se disciplina fraca
                score = PRIORITY_SCORE.get(t.priority or "medium", 2)
                if t.subject in weakness_subjects:
                    score += 2
                incomplete_topics.append({
                    "id": t.id,  # manter ID original
                    "name": t.name,
                    "subject": t.subject,
                    "hours": float(t.hours_allocated or 1.0),
                    "priority": t.priority or "medium",
                    "type": t.type or "theory",
                    "score": score,
                })
        sprint_ids_to_delete.append(sprint.id)

    if not incomplete_topics:
        raise HTTPException(status_code=400, detail="Não há tópicos incompletos para reorganizar.")

    # Ordenar por score descendente (mais crítico primeiro)
    incomplete_topics.sort(key=lambda t: t["score"], reverse=True)

    # Deletar tópicos dos sprints que serão recriados
    for sprint_id in sprint_ids_to_delete:
        topics_to_del = await _get_sprint_topics(sprint_id, session)
        for t in topics_to_del:
            if not t.is_completed:
                await session.delete(t)
        # Deletar o sprint em si (apenas futuros — start_date >= today)
        sprint_r = await session.exec(select(WeeklySprint).where(WeeklySprint.id == sprint_id))
        sp = sprint_r.first()
        if sp and sp.start_date >= today:
            await session.delete(sp)

    await session.flush()

    # Reconstruir sprints comprimidos (aumento de 25% nas horas por sprint para recuperar atraso)
    sprint_start = today
    new_sprints_data: list[dict] = []
    while sprint_start < ENEM_DATE:
        sprint_end = min(sprint_start + timedelta(days=6), ENEM_DATE - timedelta(days=1))
        study_days = _sprint_study_days(sprint_start, sprint_end, available_days)
        sprint_hours = len(study_days) * daily_hours * 1.25  # 25% mais horas para recuperar
        new_sprints_data.append({
            "start": sprint_start,
            "end": sprint_end,
            "study_days": study_days,
            "hours": sprint_hours,
        })
        sprint_start += timedelta(days=7)

    # Distribuir tópicos
    topic_dicts = [{"name": t["name"], "subject": t["subject"], "hours": t["hours"],
                    "priority": t["priority"], "type": t["type"]} for t in incomplete_topics]

    distributed = _distribute_topics_to_sprints(topic_dicts, new_sprints_data)

    # Determinar número da semana a partir do último sprint existente
    last_sprint_r = await session.exec(
        select(WeeklySprint)
        .where(WeeklySprint.study_plan_id == plan.id)
        .order_by(WeeklySprint.week_number.desc())  # type: ignore[arg-type]
    )
    last_sprint = last_sprint_r.first()
    week_offset = (last_sprint.week_number if last_sprint else 0)

    for i, (sd, topics) in enumerate(zip(new_sprints_data, distributed)):
        if not topics:
            continue
        dominant_subj = max(
            {t["subject"]: 0 for t in topics},
            key=lambda s: sum(t["hours"] for t in topics if t["subject"] == s),
        )
        theme = next(
            (t["name"] for t in topics if t["subject"] == dominant_subj and t["type"] == "theory"),
            SUBJECT_LABELS.get(dominant_subj, dominant_subj),
        )

        sprint = WeeklySprint(
            id=uuid.uuid4(),
            study_plan_id=plan.id,
            week_number=week_offset + i + 1,
            start_date=sd["start"],
            end_date=sd["end"],
            theme=theme,
            total_hours_allocated=round(sd["hours"], 1),  # type: ignore[arg-type]
            hours_completed=0.0,  # type: ignore[arg-type]
            status="in_progress" if sd["start"] <= today <= sd["end"] else "not_started",
        )
        session.add(sprint)
        await session.flush()

        for t in topics:
            days_needed = max(1, round(t["hours"] / (sd["hours"] / max(len(sd["study_days"]), 1))))
            assigned_days = [DAY_NAMES[d.weekday()] for d in sd["study_days"][:days_needed]]
            session.add(Topic(
                id=uuid.uuid4(),
                weekly_sprint_id=sprint.id,
                name=t["name"],
                subject=t["subject"],
                hours_allocated=round(t["hours"], 1),  # type: ignore[arg-type]
                type=t["type"],
                priority=t["priority"],
                scheduled_days=assigned_days,
                is_completed=False,
            ))

    plan.is_contingency = True
    plan.updated_at = utcnow()
    session.add(plan)
    await session.commit()

    logger.info("Plano de contingência gerado para user=%s", user_id)

    try:
        from app.services.notifications_service import create_notification
        from app.schemas.notifications import NotifType
        await create_notification(
            uid, NotifType.PLAN_UPDATED,
            "Plano de contingência ativado",
            "Seus tópicos foram reorganizados por prioridade ENEM para recuperar o atraso.",
            session,
            related_entity_type="study_plan",
            related_entity_id=str(plan.id),
        )
    except Exception:
        pass

    return await get_my_plan(user_id, session)


# ── Turbo Session ──────────────────────────────────────────────────

async def get_turbo_session(subject: str | None, user_id: str, session: AsyncSession) -> TurboSessionOut:
    uid = uuid.UUID(user_id)

    # Se subject não informado, usa disciplina mais fraca do plano
    if not subject:
        plan = await _get_active_plan(uid, session)
        subject = (await _find_weakest_subject(plan.id, session) if plan else None) or "matematica"

    if subject not in SUBJECT_LABELS:
        raise HTTPException(status_code=400, detail=f"Disciplina inválida: {subject}")

    # 5 questões da disciplina — priorizar medium/hard
    questions_r = await session.exec(
        select(Question)
        .where(Question.subject == subject)
        .where(Question.difficulty.in_(["medium", "hard"]))  # type: ignore[arg-type]
        .order_by(func.random())  # type: ignore[arg-type]
        .limit(5)
    )
    questions = list(questions_r.all())

    # Se não houver suficientes com medium/hard, pega qualquer dificuldade
    if len(questions) < 5:
        extra_r = await session.exec(
            select(Question)
            .where(Question.subject == subject)
            .order_by(func.random())  # type: ignore[arg-type]
            .limit(5 - len(questions))
        )
        questions.extend(extra_r.all())

    out_questions: list[TurboQuestionOut] = []
    for q in questions:
        opts_r = await session.exec(
            select(QuestionOption)
            .where(QuestionOption.question_id == q.id)
            .order_by(QuestionOption.position)  # type: ignore[arg-type]
        )
        opts = [TurboOptionOut(id=str(o.id), letter=o.letter, text=o.text) for o in opts_r.all()]
        out_questions.append(TurboQuestionOut(
            id=str(q.id),
            statement=q.statement,
            topic=q.topic,
            difficulty=q.difficulty or "medium",
            correct_answer=q.correct_answer or "",
            options=opts,
        ))

    # Tópico crítico mais fraco sugerido como foco
    topic_suggestion: str | None = None
    plan = await _get_active_plan(uid, session)
    if plan:
        sprints = await _get_sprints(plan.id, session)
        for sprint in sprints:
            topics = await _get_sprint_topics(sprint.id, session)
            crit = next(
                (t.name for t in topics
                 if not t.is_completed and t.subject == subject and t.priority in ("critical", "high")),
                None,
            )
            if crit:
                topic_suggestion = crit
                break

    return TurboSessionOut(
        subject=subject,
        subject_label=SUBJECT_LABELS.get(subject, subject),
        topic_suggestion=topic_suggestion,
        questions=out_questions,
        time_limit_minutes=15,
    )


# ── Nightly cron ───────────────────────────────────────────────────

async def run_delay_cron() -> int:
    """
    Varre todos os planos ativos, detecta atraso ≥ leve e envia
    notificação DELAY_DETECTED ao usuário se ainda não enviou hoje.
    Retorna o número de usuários notificados.
    Deve ser chamado por ARQ cron diário às 00:01 Brasília.
    """
    notified = 0
    async with AsyncSessionLocal() as session:
        plans_r = await session.exec(
            select(StudyPlan).where(StudyPlan.status == "active")
        )
        plans = list(plans_r.all())

        for plan in plans:
            try:
                status_data = await get_status(str(plan.user_id), session)
                if not status_data.delay_detected:
                    continue

                from app.services.notifications_service import create_notification
                from app.schemas.notifications import NotifType

                severity_labels = {
                    "leve": "Você está levemente atrasado no plano.",
                    "moderado": "Atenção: atraso moderado detectado no seu plano.",
                    "severo": "Alerta: atraso grave! Considere ativar o plano de contingência.",
                }
                await create_notification(
                    plan.user_id, NotifType.DELAY_DETECTED,
                    "Atraso detectado no plano",
                    severity_labels.get(status_data.severity, "Revise seu plano de estudos."),
                    session,
                    related_entity_type="study_plan",
                    related_entity_id=str(plan.id),
                )
                notified += 1
            except Exception as e:
                logger.debug("Delay cron skipped plan %s: %s", plan.id, e)

    return notified
