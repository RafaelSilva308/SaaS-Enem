import json
import uuid

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.redis import get_redis
from app.data.seed_questions import SEED_QUESTIONS
from app.models.models import Diagnostic, LearningProfile, Question, QuestionOption, QuestionStat, utcnow
from app.schemas.diagnostic import (
    DiagnosticAnswer,
    DiagnosticQuestionsResponse,
    DiagnosticResult,
    DiagnosticStatusResponse,
    DiagnosticSubmitRequest,
    LearningProfileInput,
    QuestionOptionOut,
    QuestionOut,
    SubjectScore,
    WeakArea,
)

SUBJECTS = ["linguagens", "matematica", "cn", "ch"]
SUBJECT_LABELS = {
    "linguagens": "Linguagens",
    "matematica": "Matemática",
    "cn": "Ciências da Natureza",
    "ch": "Ciências Humanas",
}
SUBJECT_RECOMMENDATIONS = {
    "linguagens": "Foque em interpretação de texto e gramática contextualizada.",
    "matematica": "Comece pelos fundamentos de álgebra e porcentagem.",
    "cn": "Revise conceitos básicos de Física, Química e Biologia.",
    "ch": "Trabalhe a linha do tempo histórica e geografia do Brasil.",
}
QUESTIONS_PER_SUBJECT = 10
CACHE_KEY = "diagnostic:questions"
CACHE_TTL = 3600  # 1 hora


def _seed_to_question_out(idx: int, q: dict) -> QuestionOut:
    options = [QuestionOptionOut(letter=o["letter"], text=o["text"], position=i) for i, o in enumerate(q["options"])]
    return QuestionOut(
        id=f"seed-{idx}",
        subject=q["subject"],
        topic=q.get("topic"),
        difficulty=q.get("difficulty"),
        statement=q["statement"],
        image_url=None,
        time_estimate_seconds=180,
        options=options,
    )


async def _get_db_questions(session: AsyncSession) -> list[QuestionOut] | None:
    result = await session.exec(select(Question).where(Question.source != "seed").limit(50))
    questions = list(result.all())
    if len(questions) < 40:
        return None
    out = []
    for q in questions:
        opts_result = await session.exec(
            select(QuestionOption).where(QuestionOption.question_id == q.id)
        )
        options = [QuestionOptionOut(letter=o.letter, text=o.text, position=o.position) for o in opts_result.all()]
        out.append(QuestionOut(
            id=str(q.id),
            subject=q.subject or "",
            topic=q.topic,
            difficulty=q.difficulty,
            statement=q.statement,
            image_url=q.image_url,
            time_estimate_seconds=q.time_estimate_seconds,
            options=options,
        ))
    return out


async def get_diagnostic_questions(session: AsyncSession) -> DiagnosticQuestionsResponse:
    redis = await get_redis()
    cached = await redis.get(CACHE_KEY)
    if cached:
        data = json.loads(cached)
        return DiagnosticQuestionsResponse.model_validate(data)

    db_questions = await _get_db_questions(session)

    if db_questions:
        questions = db_questions[:40]
    else:
        # Usa seed questions (desenvolvimento)
        questions = [_seed_to_question_out(i, q) for i, q in enumerate(SEED_QUESTIONS)]

    response = DiagnosticQuestionsResponse(
        questions=questions,
        total=len(questions),
        subjects=SUBJECTS,
    )

    await redis.setex(CACHE_KEY, CACHE_TTL, json.dumps(response.model_dump()))

    return response


def _calculate_scores(answers: list[DiagnosticAnswer]) -> dict[str, dict]:
    answer_map = {a.question_id: a.answer for a in answers}
    scores: dict[str, dict] = {s: {"correct": 0, "total": 0} for s in SUBJECTS}

    for i, q in enumerate(SEED_QUESTIONS):
        qid = f"seed-{i}"
        subj = q["subject"]
        if subj not in scores:
            continue
        scores[subj]["total"] += 1
        if answer_map.get(qid) == q["correct_answer"]:
            scores[subj]["correct"] += 1

    return scores


def _get_level(score: int) -> str:
    if score < 60:
        return "weak"
    if score < 80:
        return "moderate"
    return "strong"


def _estimate_hours(scores: dict[str, dict]) -> int:
    total = 0
    for subj, data in scores.items():
        pct = (data["correct"] / data["total"] * 100) if data["total"] > 0 else 0
        if pct < 40:
            total += 60
        elif pct < 60:
            total += 45
        elif pct < 80:
            total += 30
        else:
            total += 15
    return total


async def submit_diagnostic(
    user_id: str,
    data: DiagnosticSubmitRequest,
    session: AsyncSession,
) -> DiagnosticResult:
    # Checar se já existe diagnóstico ativo
    result = await session.exec(
        select(Diagnostic).where(Diagnostic.user_id == uuid.UUID(user_id))
    )
    if result.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Diagnóstico já realizado. Use /diagnostic/result para ver seus resultados.",
        )

    raw_scores = _calculate_scores(data.answers)

    subject_scores: list[SubjectScore] = []
    weak_areas: list[WeakArea] = []

    scores_db = {}
    for subj in SUBJECTS:
        s = raw_scores.get(subj, {"correct": 0, "total": QUESTIONS_PER_SUBJECT})
        total = s["total"] or QUESTIONS_PER_SUBJECT
        pct = int(s["correct"] / total * 100)
        level = _get_level(pct)
        scores_db[subj] = pct

        subject_scores.append(SubjectScore(
            subject=subj,
            label=SUBJECT_LABELS[subj],
            score=pct,
            correct=s["correct"],
            total=total,
            level=level,
        ))

        if level == "weak":
            weak_areas.append(WeakArea(
                subject=subj,
                label=SUBJECT_LABELS[subj],
                score=pct,
                recommendation=SUBJECT_RECOMMENDATIONS[subj],
            ))

    estimated_hours = _estimate_hours(raw_scores)
    overall = int(sum(s.score for s in subject_scores) / len(subject_scores))

    # Salvar diagnóstico
    diag = Diagnostic(
        id=uuid.uuid4(),
        user_id=uuid.UUID(user_id),
        linguagens_score=scores_db.get("linguagens"),
        matematica_score=scores_db.get("matematica"),
        cn_score=scores_db.get("cn"),
        ch_score=scores_db.get("ch"),
        estimated_hours=estimated_hours,
        weak_areas=[
            {"subject": w.subject, "score": w.score, "recommendation": w.recommendation}
            for w in weak_areas
        ],
        learning_profile=data.learning_profile.learning_style,
        completed_at=utcnow(),
    )
    session.add(diag)

    # Salvar/atualizar learning profile
    lp_result = await session.exec(
        select(LearningProfile).where(LearningProfile.user_id == uuid.UUID(user_id))
    )
    existing_lp = lp_result.first()
    lp = data.learning_profile
    # SQLModel aceita float para coluna Decimal(3,1) — SQLAlchemy faz a conversão
    daily_hours = float(lp.daily_hours_goal)

    if existing_lp:
        existing_lp.learning_style = lp.learning_style
        existing_lp.preferred_time = lp.preferred_time
        existing_lp.daily_hours_goal = daily_hours  # type: ignore[assignment]
        existing_lp.available_days = lp.available_days
        session.add(existing_lp)
    else:
        new_lp = LearningProfile(
            id=uuid.uuid4(),
            user_id=uuid.UUID(user_id),
            learning_style=lp.learning_style,
            preferred_time=lp.preferred_time,
            daily_hours_goal=daily_hours,  # type: ignore[arg-type]
            available_days=lp.available_days,
        )
        session.add(new_lp)

    await session.commit()
    await session.refresh(diag)

    return DiagnosticResult(
        diagnostic_id=str(diag.id),
        scores=subject_scores,
        weak_areas=weak_areas,
        estimated_hours=estimated_hours,
        overall_score=overall,
        learning_profile=data.learning_profile.learning_style,
    )


async def get_diagnostic_result(user_id: str, session: AsyncSession) -> DiagnosticResult:
    result = await session.exec(
        select(Diagnostic).where(Diagnostic.user_id == uuid.UUID(user_id))
    )
    diag = result.first()
    if not diag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagnóstico não encontrado")

    scores_map = {
        "linguagens": diag.linguagens_score or 0,
        "matematica": diag.matematica_score or 0,
        "cn": diag.cn_score or 0,
        "ch": diag.ch_score or 0,
    }

    subject_scores = [
        SubjectScore(
            subject=s,
            label=SUBJECT_LABELS[s],
            score=scores_map[s],
            correct=round(scores_map[s] / 10),
            total=10,
            level=_get_level(scores_map[s]),
        )
        for s in SUBJECTS
    ]

    weak_areas = [
        WeakArea(
            subject=s.subject,
            label=s.label,
            score=s.score,
            recommendation=SUBJECT_RECOMMENDATIONS[s.subject],
        )
        for s in subject_scores
        if s.level == "weak"
    ]

    overall = int(sum(s.score for s in subject_scores) / len(subject_scores))

    return DiagnosticResult(
        diagnostic_id=str(diag.id),
        scores=subject_scores,
        weak_areas=weak_areas,
        estimated_hours=diag.estimated_hours or 120,
        overall_score=overall,
        learning_profile=diag.learning_profile or "visual",
    )


async def get_onboarding_status(user_id: str, session: AsyncSession) -> DiagnosticStatusResponse:
    result = await session.exec(
        select(Diagnostic).where(Diagnostic.user_id == uuid.UUID(user_id))
    )
    diag = result.first()
    return DiagnosticStatusResponse(
        has_completed=diag is not None,
        diagnostic_id=str(diag.id) if diag else None,
    )
