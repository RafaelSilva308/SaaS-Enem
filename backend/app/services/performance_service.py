"""
Serviço de Performance — TRI pós-simulado, histórico e projeção ENEM.

Fluxo:
  1. submit_exam() chama calculate_tri_for_result() após commit.
  2. A função calcula TRI por disciplina (MLE ≥ 3 itens, fallback otherwise).
  3. Atualiza performance_by_subject com tri_score e score_estimate (média geral).
  4. Os endpoints /performance/* expõem histórico e projeção.
"""

import math
import uuid
from collections import defaultdict

from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.models import (
    Exam, ExamAnswer, ExamResult, Question, QuestionStat,
    ScheduledExam, StudyPlan, StudySession, Topic, User, UserStreak, WeeklySprint,
)
from app.schemas.performance import (
    ComparisonData, ENEMPredictionResponse, ErrorPattern, ErrorPatternsData,
    OverviewData, SubjectDeepDiveData, SubjectPrediction,
    TRIHistoryItem, TRIHistoryResponse, WeakTopic,
)
from app.services.tri_service import (
    estimate_raw,
    enem_to_theta,
    get_item_params,
    mle_theta,
    theta_to_enem,
)

SUBJECT_LABELS = {
    "linguagens": "Linguagens",
    "matematica": "Matemática",
    "cn": "Ciências da Natureza",
    "ch": "Ciências Humanas",
}

# Mínimo de itens respondidos para usar MLE (abaixo disso, usa estimativa raw)
MLE_MIN_ITEMS = 3


# ── TRI por resultado ──────────────────────────────────────────────

async def calculate_tri_for_result(result: ExamResult, db: AsyncSession) -> None:
    """
    Calcula o TRI para um ExamResult já persistido.
    Atualiza result.score_estimate e result.performance_by_subject.
    Deve ser chamado APÓS db.commit() no submit_exam.
    """
    if result.score_estimate is not None:
        return  # já calculado (idempotente)

    # Buscar respostas do simulado
    answers_r = await db.exec(
        select(ExamAnswer).where(ExamAnswer.exam_result_id == result.id)
    )
    answers = list(answers_r.all())

    if not answers:
        return

    # Buscar questões para obter a disciplina de cada resposta
    q_ids = [a.question_id for a in answers if a.is_correct is not None]
    if not q_ids:
        return

    qs_r = await db.exec(
        select(Question).where(Question.id.in_(q_ids))  # type: ignore[arg-type]
    )
    q_map: dict[uuid.UUID, Question] = {q.id: q for q in qs_r.all()}

    # Agrupar respostas respondidas por disciplina
    by_subject: dict[str, list[tuple[bool, object]]] = defaultdict(list)
    for answer in answers:
        if answer.is_correct is None:
            continue  # não respondida — excluída do cálculo
        q = q_map.get(answer.question_id)
        if not q:
            continue
        subj = q.subject or "other"
        params = get_item_params(answer.difficulty)
        by_subject[subj].append((answer.is_correct, params))

    if not by_subject:
        return

    # Calcular TRI por disciplina
    tri_by_subject: dict[str, int] = {}
    for subj, responses in by_subject.items():
        n = len(responses)
        n_correct = sum(1 for c, _ in responses if c)

        if n >= MLE_MIN_ITEMS:
            theta = mle_theta(responses)  # type: ignore[arg-type]
            tri_by_subject[subj] = theta_to_enem(theta)
        else:
            # Poucos itens: estimativa simples com desconto de chute
            tri_by_subject[subj] = estimate_raw(n_correct, n)

    # Score geral: média das disciplinas presentes
    overall = round(sum(tri_by_subject.values()) / len(tri_by_subject))

    # Enriquecer performance_by_subject com tri_score por disciplina
    perf = dict(result.performance_by_subject or {})
    for subj, tri in tri_by_subject.items():
        if subj in perf:
            perf[subj]["tri_score"] = tri
        else:
            perf[subj] = {"tri_score": tri, "total": 0, "correct": 0, "wrong": 0, "unanswered": 0}

    result.score_estimate = overall
    result.performance_by_subject = perf
    db.add(result)
    await db.commit()


# ── Histórico TRI ──────────────────────────────────────────────────

async def get_tri_history(user: User, db: AsyncSession) -> TRIHistoryResponse:
    """Retorna os últimos 10 simulados concluídos com scores TRI."""
    results_r = await db.exec(
        select(ExamResult)
        .where(ExamResult.user_id == user.id)
        .order_by(ExamResult.completed_at.desc())  # type: ignore[arg-type]
        .limit(10)
    )
    results = list(results_r.all())

    if not results:
        return TRIHistoryResponse(history=[], data_points=0)

    # Buscar scheduled_exams e exams para metadados
    se_ids = [r.scheduled_exam_id for r in results]
    ses_r = await db.exec(
        select(ScheduledExam).where(ScheduledExam.id.in_(se_ids))  # type: ignore[arg-type]
    )
    se_map: dict[uuid.UUID, ScheduledExam] = {se.id: se for se in ses_r.all()}

    exam_ids = list({se.exam_id for se in se_map.values()})
    exams_r = await db.exec(
        select(Exam).where(Exam.id.in_(exam_ids))  # type: ignore[arg-type]
    )
    exam_map: dict[uuid.UUID, Exam] = {e.id: e for e in exams_r.all()}

    history: list[TRIHistoryItem] = []
    for r in reversed(results):  # ordem cronológica para o gráfico
        se = se_map.get(r.scheduled_exam_id)
        exam = exam_map.get(se.exam_id) if se else None
        perf = r.performance_by_subject or {}

        tri_by_subject = {
            subj: int(data["tri_score"])
            for subj, data in perf.items()
            if isinstance(data, dict) and "tri_score" in data
        }

        history.append(TRIHistoryItem(
            exam_id=str(r.id),
            scheduled_exam_id=str(r.scheduled_exam_id),
            exam_type=exam.exam_type if exam else "unknown",
            subject=exam.subject if exam else None,
            completed_at=r.completed_at,
            overall_tri=r.score_estimate,
            raw_score=r.raw_score or 0,
            tri_by_subject=tri_by_subject,
        ))

    return TRIHistoryResponse(history=history, data_points=len(history))


# ── Projeção ENEM ──────────────────────────────────────────────────

async def get_enem_prediction(user: User, db: AsyncSession) -> ENEMPredictionResponse:
    """
    Projeta a nota do ENEM com base nos últimos simulados.

    Algoritmo:
    1. Coleta θ por disciplina dos últimos 5 resultados.
    2. Média ponderada (mais recente = peso maior) por disciplina.
    3. Intervalo de confiança: média ± 1.5σ ponderado.
    4. Tendência: compara θ mais recente com o mais antigo.
    """
    results_r = await db.exec(
        select(ExamResult)
        .where(ExamResult.user_id == user.id)
        .order_by(ExamResult.completed_at.desc())  # type: ignore[arg-type]
        .limit(5)
    )
    results = list(results_r.all())

    if not results:
        return ENEMPredictionResponse(
            projected_score=None, confidence_low=None, confidence_high=None,
            by_subject={}, data_points=0, has_enough_data=False,
            message="Complete pelo menos 1 simulado para ver a projeção.",
        )

    # Coletar θ por disciplina de cada resultado (mais recente primeiro)
    subj_thetas: dict[str, list[float]] = defaultdict(list)
    for r in results:
        perf = r.performance_by_subject or {}
        for subj, data in perf.items():
            if isinstance(data, dict) and "tri_score" in data:
                theta = enem_to_theta(int(data["tri_score"]))
                subj_thetas[subj].append(theta)

    if not subj_thetas:
        # Resultados sem TRI (simulados anteriores ao Stage 2.3)
        return ENEMPredictionResponse(
            projected_score=None, confidence_low=None, confidence_high=None,
            by_subject={}, data_points=len(results), has_enough_data=False,
            message="Nenhum score TRI calculado ainda. Complete um novo simulado.",
        )

    # Calcula estatísticas ponderadas por disciplina
    by_subject: dict[str, SubjectPrediction] = {}
    projected_scores: list[int] = []

    for subj, thetas in subj_thetas.items():
        n = len(thetas)
        # Pesos: mais recente (índice 0) = maior peso (n), mais antigo = menor (1)
        weights = list(range(n, 0, -1))
        total_w = sum(weights)

        mean_theta = sum(t * w for t, w in zip(thetas, weights)) / total_w

        # Desvio-padrão ponderado
        if n == 1:
            sigma = 0.80   # incerteza padrão sem histórico
        elif n == 2:
            sigma = max(0.40, abs(thetas[0] - thetas[1]) * 0.7)
        else:
            variance = sum(w * (t - mean_theta) ** 2 for t, w in zip(thetas, weights)) / total_w
            sigma = max(0.30, math.sqrt(variance))

        projected = theta_to_enem(mean_theta)
        low = theta_to_enem(mean_theta - 1.5 * sigma)
        high = theta_to_enem(mean_theta + 1.5 * sigma)

        # Tendência: δθ = θ_mais_recente - θ_mais_antigo
        delta = thetas[0] - thetas[-1]
        trend = "stable"
        if delta > 0.25:
            trend = "up"
        elif delta < -0.25:
            trend = "down"

        by_subject[subj] = SubjectPrediction(
            subject=subj,
            subject_label=SUBJECT_LABELS.get(subj, subj),
            projected=projected,
            confidence_low=low,
            confidence_high=high,
            trend=trend,
        )
        projected_scores.append(projected)

    # Score geral projetado
    if not projected_scores:
        return ENEMPredictionResponse(
            projected_score=None, confidence_low=None, confidence_high=None,
            by_subject={}, data_points=len(results), has_enough_data=False,
        )

    overall = round(sum(projected_scores) / len(projected_scores))

    # Intervalo de confiança geral (via variância entre disciplinas)
    if len(projected_scores) > 1:
        mean_p = overall
        variance_p = sum((p - mean_p) ** 2 for p in projected_scores) / len(projected_scores)
        sigma_p = max(30, math.sqrt(variance_p))
    else:
        sigma_p = 80

    ci_low  = max(200, overall - round(1.5 * sigma_p))
    ci_high = min(1000, overall + round(1.5 * sigma_p))

    return ENEMPredictionResponse(
        projected_score=overall,
        confidence_low=ci_low,
        confidence_high=ci_high,
        by_subject=by_subject,
        data_points=len(results),
        has_enough_data=len(results) >= 3,
        message=None if len(results) >= 3 else
                f"Projeção com {len(results)} simulado(s). Complete mais para aumentar a precisão.",
    )


# ── Stage 2.4 ──────────────────────────────────────────────────────

# Médias nacionais ENEM por disciplina (taxa de acerto aproximada)
# Baseadas em relatórios pedagógicos INEP 2021–2023
_NATIONAL_AVG: dict[str, int] = {
    "linguagens": 54,
    "matematica": 38,
    "cn":         46,
    "ch":         56,
}

_ERROR_COLORS = {
    "Atenção":    "#f59e0b",
    "Conceitual": "#ef4444",
    "Processo":   "#7c3aed",
    "Tempo":      "#64748b",
}


async def get_overview(user: User, db: AsyncSession) -> OverviewData:
    """KPIs gerais do usuário."""

    # Horas estudadas (sessões concluídas)
    sessions_r = await db.exec(
        select(StudySession)
        .where(StudySession.user_id == user.id)
        .where(StudySession.end_time != None)  # noqa: E711
    )
    sessions = sessions_r.all()
    total_hours = round(sum((s.duration_minutes or 0) / 60 for s in sessions), 1)

    # Questões e taxa de acerto
    qstats_r = await db.exec(
        select(QuestionStat).where(QuestionStat.user_id == user.id)
    )
    qstats = qstats_r.all()
    total_attempts = sum(s.attempts for s in qstats)
    total_correct  = sum(s.correct  for s in qstats)
    accuracy = int(total_correct / total_attempts * 100) if total_attempts else 0

    # Streak
    streak_r = await db.exec(
        select(UserStreak).where(UserStreak.user_id == user.id)
    )
    streak_obj = streak_r.first()
    current_streak = streak_obj.current_streak if streak_obj else 0

    # Simulados concluídos
    exams_r = await db.exec(
        select(func.count()).select_from(ExamResult)  # type: ignore[arg-type]
        .where(ExamResult.user_id == user.id)
    )
    exams_completed = exams_r.first() or 0

    # Progresso do plano de estudos
    plan_r = await db.exec(
        select(StudyPlan)
        .where(StudyPlan.user_id == user.id)
        .where(StudyPlan.status == "active")
    )
    plan = plan_r.first()
    topics_completed = topics_total = plan_progress = 0

    if plan:
        sprints_r = await db.exec(
            select(WeeklySprint).where(WeeklySprint.study_plan_id == plan.id)
        )
        sprint_ids = [s.id for s in sprints_r.all()]
        if sprint_ids:
            topics_r = await db.exec(
                select(Topic).where(Topic.weekly_sprint_id.in_(sprint_ids))  # type: ignore[arg-type]
            )
            all_topics = topics_r.all()
            topics_total     = len(all_topics)
            topics_completed = sum(1 for t in all_topics if t.is_completed)
            plan_progress    = int(topics_completed / topics_total * 100) if topics_total else 0

    return OverviewData(
        hours_studied=total_hours,
        questions_answered=total_attempts,
        accuracy_rate=accuracy,
        current_streak=current_streak,
        exams_completed=int(exams_completed),
        topics_completed=topics_completed,
        topics_total=topics_total,
        plan_progress=plan_progress,
    )


async def get_error_patterns(user: User, db: AsyncSession) -> ErrorPatternsData:
    """
    Classifica os erros do usuário em padrões:
    - Atenção   → questão fácil respondida errada
    - Processo  → questão média respondida errada
    - Conceitual→ questão difícil respondida errada
    - Tempo     → questão não respondida no simulado
    """
    # IDs dos resultados do usuário
    result_ids_r = await db.exec(
        select(ExamResult.id).where(ExamResult.user_id == user.id)
    )
    result_ids = list(result_ids_r.all())

    if not result_ids:
        return ErrorPatternsData(total_wrong=0, total_unanswered=0, patterns=[])

    counts: dict[str, int] = {"Atenção": 0, "Processo": 0, "Conceitual": 0}

    wrong_r = await db.exec(
        select(ExamAnswer)
        .where(ExamAnswer.exam_result_id.in_(result_ids))  # type: ignore[arg-type]
        .where(ExamAnswer.is_correct == False)  # noqa: E712
    )
    for a in wrong_r.all():
        d = a.difficulty or "medium"
        if d == "easy":
            counts["Atenção"] += 1
        elif d == "hard":
            counts["Conceitual"] += 1
        else:
            counts["Processo"] += 1

    unanswered_r = await db.exec(
        select(func.count()).select_from(ExamAnswer)  # type: ignore[arg-type]
        .where(ExamAnswer.exam_result_id.in_(result_ids))  # type: ignore[arg-type]
        .where(ExamAnswer.is_correct == None)  # noqa: E711
    )
    unanswered_count = unanswered_r.first() or 0

    total_wrong = sum(counts.values())
    grand_total  = total_wrong + unanswered_count or 1

    descriptions = {
        "Atenção":    "Questões fáceis respondidas errado",
        "Processo":   "Questões médias respondidas errado",
        "Conceitual": "Questões difíceis respondidas errado",
    }

    patterns = [
        ErrorPattern(
            type=t,
            description=descriptions[t],
            count=c,
            percentage=int(c / grand_total * 100),
            color=_ERROR_COLORS[t],
        )
        for t, c in counts.items()
        if c > 0
    ]

    if unanswered_count:
        patterns.append(ErrorPattern(
            type="Tempo",
            description="Questões não respondidas no simulado",
            count=int(unanswered_count),
            percentage=int(unanswered_count / grand_total * 100),
            color=_ERROR_COLORS["Tempo"],
        ))

    return ErrorPatternsData(
        total_wrong=total_wrong,
        total_unanswered=int(unanswered_count),
        patterns=patterns,
    )


async def get_subject_deep_dive(user: User, subject: str, db: AsyncSession) -> SubjectDeepDiveData:
    """Deep-dive de desempenho por disciplina."""
    # Questões desta disciplina
    qs_r = await db.exec(select(Question).where(Question.subject == subject))
    questions = qs_r.all()
    q_ids = [q.id for q in questions]
    q_map = {q.id: q for q in questions}

    # Stats do usuário para essas questões
    if q_ids:
        stats_r = await db.exec(
            select(QuestionStat)
            .where(QuestionStat.user_id == user.id)
            .where(QuestionStat.question_id.in_(q_ids))  # type: ignore[arg-type]
        )
        stats = stats_r.all()
    else:
        stats = []

    # Agrupar por tópico
    topic_data: dict[str, dict] = defaultdict(lambda: {"attempts": 0, "correct": 0})
    for stat in stats:
        q = q_map.get(stat.question_id)
        if q and q.topic:
            topic_data[q.topic]["attempts"] += stat.attempts
            topic_data[q.topic]["correct"]  += stat.correct

    weak_topics = sorted(
        [
            WeakTopic(
                topic=t,
                attempts=d["attempts"],
                correct=d["correct"],
                accuracy=int(d["correct"] / d["attempts"] * 100) if d["attempts"] else 0,
            )
            for t, d in topic_data.items()
            if d["attempts"] > 0
        ],
        key=lambda w: w.accuracy,
    )[:6]

    total_attempts = sum(s.attempts for s in stats)
    total_correct  = sum(s.correct  for s in stats)
    accuracy = int(total_correct / total_attempts * 100) if total_attempts else 0

    # Histórico TRI para esta disciplina
    results_r = await db.exec(
        select(ExamResult)
        .where(ExamResult.user_id == user.id)
        .order_by(ExamResult.completed_at.desc())  # type: ignore[arg-type]
        .limit(5)
    )
    tri_history: list[int] = []
    for r in reversed(list(results_r.all())):
        perf = r.performance_by_subject or {}
        data = perf.get(subject)
        if isinstance(data, dict) and "tri_score" in data:
            tri_history.append(int(data["tri_score"]))

    trend = "stable"
    if len(tri_history) >= 2:
        delta = tri_history[-1] - tri_history[0]
        if delta > 20:
            trend = "up"
        elif delta < -20:
            trend = "down"

    return SubjectDeepDiveData(
        subject=subject,
        subject_label=SUBJECT_LABELS.get(subject, subject),
        accuracy_rate=accuracy,
        questions_answered=total_attempts,
        questions_correct=total_correct,
        weak_topics=weak_topics,
        tri_history=tri_history,
        recent_trend=trend,
    )


async def get_comparison(user: User, db: AsyncSession) -> ComparisonData:
    """
    Compara a taxa de acerto do usuário por disciplina
    com as médias nacionais aproximadas do ENEM.
    """
    user_scores: dict[str, int] = {}

    for subj in ["linguagens", "matematica", "cn", "ch"]:
        qs_r = await db.exec(select(Question).where(Question.subject == subj))
        questions = qs_r.all()
        q_ids = [q.id for q in questions]

        if not q_ids:
            user_scores[subj] = 0
            continue

        stats_r = await db.exec(
            select(QuestionStat)
            .where(QuestionStat.user_id == user.id)
            .where(QuestionStat.question_id.in_(q_ids))  # type: ignore[arg-type]
        )
        stats = stats_r.all()
        total   = sum(s.attempts for s in stats)
        correct = sum(s.correct  for s in stats)
        user_scores[subj] = int(correct / total * 100) if total else 0

    # Percentil aproximado via curva normal (σ ≈ 15 pp para taxa de acerto ENEM)
    subjects_with_data = [s for s in user_scores if user_scores[s] > 0]
    if subjects_with_data:
        user_avg     = sum(user_scores[s] for s in subjects_with_data) / len(subjects_with_data)
        national_avg = sum(_NATIONAL_AVG[s] for s in subjects_with_data) / len(subjects_with_data)
        z            = (user_avg - national_avg) / 15
        # Aproximação linear da CDF normal N(0,1) ≈ Φ(z) ≈ 0.5 + 0.34·z (para |z| ≤ 1)
        percentile = max(1, min(99, int(50 + z * 34)))
    else:
        percentile = 50

    return ComparisonData(
        user_scores=user_scores,
        national_avg=_NATIONAL_AVG,
        percentile=percentile,
    )
