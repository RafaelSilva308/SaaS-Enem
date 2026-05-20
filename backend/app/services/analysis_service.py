"""
Serviço de Análise Comparativa.

Fornece:
  1. get_enem_historical()    — scores do usuário vs médias nacionais por ano
  2. get_topic_frequency()    — frequência histórica dos tópicos do ENEM
  3. get_cohort_comparison()  — distribuição de scores TRI de todos os usuários
  4. get_probable_topics()    — tópicos mais prováveis para 2026

Requer assinatura premium (verificada na rota via get_premium_user dep).
"""

import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.data.curriculum import CURRICULUM, SUBJECT_LABELS
from app.data.enem_historical import ENEM_HISTORICAL, PRIORITY_FREQUENCY
from app.models.models import ExamResult
from app.schemas.analysis import (
    CohortBucket, CohortComparisonOut, ENEMHistoricalOut, HistoricalYear,
    ProbableTopicsOut, TopicFrequencyItem, TopicFrequencyOut, TopProbableTopic,
)

SUBJECTS = ["linguagens", "matematica", "cn", "ch"]

_COHORT_BUCKETS = [
    ("200–299", 200, 300),
    ("300–399", 300, 400),
    ("400–499", 400, 500),
    ("500–599", 500, 600),
    ("600–699", 600, 700),
    ("700–799", 700, 800),
    ("800–899", 800, 900),
    ("900+",    900, 1001),
]


# ── Historical ─────────────────────────────────────────────────────

async def get_enem_historical(user_id: str, session: AsyncSession) -> ENEMHistoricalOut:
    uid = uuid.UUID(user_id)

    # Últimos 5 simulados com performance_by_subject preenchido
    results_r = await session.exec(
        select(ExamResult)
        .where(ExamResult.user_id == uid)
        .where(ExamResult.performance_by_subject.is_not(None))  # type: ignore[arg-type]
        .order_by(ExamResult.completed_at.desc())  # type: ignore[arg-type]
        .limit(5)
    )
    results = results_r.all()

    # Médias por disciplina (últimos 5 simulados)
    scores: dict[str, list[int]] = {s: [] for s in SUBJECTS}
    for r in results:
        perf = r.performance_by_subject or {}
        for subj in SUBJECTS:
            if subj in perf and isinstance(perf[subj], dict):
                tri = perf[subj].get("tri_score")
                if tri is not None:
                    scores[subj].append(int(tri))

    user_scores: dict[str, int | None] = {
        s: round(sum(v) / len(v)) if v else None
        for s, v in scores.items()
    }
    has_data = any(v is not None for v in user_scores.values())

    return ENEMHistoricalOut(
        user_scores=user_scores,
        historical=[HistoricalYear(**row) for row in ENEM_HISTORICAL],
        has_user_data=has_data,
    )


# ── Topic frequency ────────────────────────────────────────────────

def get_topic_frequency() -> TopicFrequencyOut:
    subjects_out: dict[str, list[TopicFrequencyItem]] = {}
    for subj in SUBJECTS:
        topics = CURRICULUM.get(subj, [])
        items = [
            TopicFrequencyItem(
                name=t["name"],
                frequency=PRIORITY_FREQUENCY.get(t["priority"], 30),
                priority=t["priority"],
            )
            for t in topics
        ]
        # Ordenar: maior frequência primeiro
        items.sort(key=lambda x: x.frequency, reverse=True)
        subjects_out[subj] = items
    return TopicFrequencyOut(subjects=subjects_out)


# ── Cohort comparison ──────────────────────────────────────────────

async def get_cohort_comparison(user_id: str, session: AsyncSession) -> CohortComparisonOut:
    uid = uuid.UUID(user_id)

    # Score mais recente do usuário
    user_result_r = await session.exec(
        select(ExamResult)
        .where(ExamResult.user_id == uid)
        .where(ExamResult.score_estimate.is_not(None))  # type: ignore[arg-type]
        .order_by(ExamResult.completed_at.desc())  # type: ignore[arg-type]
        .limit(1)
    )
    user_result = user_result_r.first()
    user_score = user_result.score_estimate if user_result else None

    # Todos os últimos scores por usuário (subquery: MAX(completed_at) por user_id)
    # Abordagem simples: buscar todos os results e deduplica por user_id
    all_r = await session.exec(
        select(ExamResult)
        .where(ExamResult.score_estimate.is_not(None))  # type: ignore[arg-type]
        .order_by(ExamResult.completed_at.desc())  # type: ignore[arg-type]
    )
    all_results = all_r.all()

    # Pegar o score mais recente por usuário
    seen: set[uuid.UUID] = set()
    latest_scores: list[int] = []
    for r in all_results:
        if r.user_id not in seen:
            seen.add(r.user_id)
            if r.score_estimate is not None:
                latest_scores.append(int(r.score_estimate))

    total_users = len(latest_scores)

    # Distribuição em buckets
    distribution = []
    for label, lo, hi in _COHORT_BUCKETS:
        count = sum(1 for s in latest_scores if lo <= s < hi)
        distribution.append(CohortBucket(label=label, count=count, range_start=lo, range_end=hi))

    # Percentil do usuário
    percentile: int | None = None
    if user_score is not None and total_users > 0:
        below = sum(1 for s in latest_scores if s < user_score)
        percentile = min(99, max(1, round(below / total_users * 100)))

    return CohortComparisonOut(
        distribution=distribution,
        user_score=user_score,
        percentile=percentile,
        total_users=total_users,
        has_user_data=user_score is not None,
    )


# ── Probable topics ────────────────────────────────────────────────

def get_probable_topics() -> ProbableTopicsOut:
    subjects_out: dict[str, list[TopProbableTopic]] = {}
    for subj in SUBJECTS:
        topics = CURRICULUM.get(subj, [])
        critical = [
            TopProbableTopic(
                name=t["name"],
                priority=t["priority"],
                frequency=PRIORITY_FREQUENCY.get(t["priority"], 30),
            )
            for t in topics
            if t["priority"] in ("critical", "high")
        ][:5]
        subjects_out[subj] = critical
    return ProbableTopicsOut(subjects=subjects_out)
