import json
import random
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.redis import get_redis
from app.models.models import (
    Exam, ExamAnswer, ExamResult, Question, QuestionOption,
    ScheduledExam, User, utcnow,
)
from app.schemas.exams import (
    AnswerDetail, CreateExamRequest, CreateExamResponse, ExamResultDetail,
    QuestionForExam, QuestionOptionOut, SaveAnswerResponse, ScheduledExamSummary,
    StartExamResponse, SubjectPerf, SubmitExamResponse,
    ToggleMarkResponse,
)
from app.services.questions_service import _ensure_seeded
from app.services import performance_service

SUBJECT_LABELS = {
    "linguagens": "Linguagens",
    "matematica": "Matemática",
    "cn": "Ciências da Natureza",
    "ch": "Ciências Humanas",
}

EXAM_CONFIGS = {
    "complete":   {"total": 40, "duration": 180},
    "by_subject": {"total": 10, "duration": 45},
    "quiz":       {"total": 5,  "duration": 10},
}

# ── Redis key helpers ──────────────────────────────────────────────

def _key_questions(exam_id: str) -> str:
    return f"exam_session:{exam_id}:questions"

def _key_answers(exam_id: str) -> str:
    return f"exam_session:{exam_id}:answers"

def _key_marked(exam_id: str) -> str:
    return f"exam_session:{exam_id}:marked"


# ── Create exam ────────────────────────────────────────────────────

async def create_exam(
    user: User,
    body: CreateExamRequest,
    db: AsyncSession,
) -> CreateExamResponse:
    await _ensure_seeded(db)

    cfg = EXAM_CONFIGS[body.exam_type]
    if body.exam_type == "by_subject" and not body.subject:
        raise HTTPException(status_code=400, detail="Informe a disciplina para simulado por área.")

    now = utcnow()
    exam = Exam(
        exam_type=body.exam_type,
        subject=body.subject if body.exam_type == "by_subject" else None,
        total_questions=cfg["total"],
        duration_minutes=cfg["duration"],
        is_template=False,
    )
    db.add(exam)
    await db.flush()

    scheduled = ScheduledExam(
        user_id=user.id,
        exam_id=exam.id,
        scheduled_at=now,
        status="scheduled",
    )
    db.add(scheduled)
    await db.commit()
    await db.refresh(scheduled)

    return CreateExamResponse(
        scheduled_exam_id=str(scheduled.id),
        exam_type=body.exam_type,
        subject=exam.subject,
        total_questions=cfg["total"],
        duration_minutes=cfg["duration"],
        scheduled_at=now,
    )


# ── List scheduled exams ───────────────────────────────────────────

async def list_scheduled_exams(user: User, db: AsyncSession) -> list[ScheduledExamSummary]:
    se_result = await db.exec(
        select(ScheduledExam)
        .where(ScheduledExam.user_id == user.id)
        .order_by(ScheduledExam.scheduled_at.desc())  # type: ignore[arg-type]
        .limit(50)
    )
    scheduled_exams = se_result.all()
    if not scheduled_exams:
        return []

    exam_ids = list({se.exam_id for se in scheduled_exams})
    exams_result = await db.exec(select(Exam).where(Exam.id.in_(exam_ids)))  # type: ignore[arg-type]
    exams_map = {e.id: e for e in exams_result.all()}

    se_ids = [se.id for se in scheduled_exams]
    results_result = await db.exec(
        select(ExamResult).where(ExamResult.scheduled_exam_id.in_(se_ids))  # type: ignore[arg-type]
    )
    results_map = {r.scheduled_exam_id: r for r in results_result.all()}

    items = []
    for se in scheduled_exams:
        exam = exams_map.get(se.exam_id)
        result = results_map.get(se.id)
        items.append(ScheduledExamSummary(
            id=str(se.id),
            exam_type=exam.exam_type if exam else "quiz",
            subject=exam.subject if exam else None,
            total_questions=exam.total_questions if exam else 0,
            duration_minutes=exam.duration_minutes if exam else 0,
            status=se.status,
            scheduled_at=se.scheduled_at,
            start_time=se.start_time,
            end_time=se.end_time,
            result_summary={
                "correct_answers": result.correct_answers,
                "total_questions": result.total_questions,
                "raw_score": result.raw_score,
            } if result else None,
        ))
    return items


# ── Start exam ─────────────────────────────────────────────────────

async def start_exam(
    user: User,
    scheduled_exam_id: str,
    db: AsyncSession,
) -> StartExamResponse:
    se_result = await db.exec(
        select(ScheduledExam)
        .where(ScheduledExam.id == uuid.UUID(scheduled_exam_id))
        .where(ScheduledExam.user_id == user.id)
    )
    se = se_result.first()
    if not se:
        raise HTTPException(status_code=404, detail="Simulado não encontrado")
    if se.status == "completed":
        raise HTTPException(status_code=400, detail="Simulado já finalizado")

    exam_result = await db.exec(select(Exam).where(Exam.id == se.exam_id))
    exam = exam_result.first()
    if not exam:
        raise HTTPException(status_code=404, detail="Template de simulado não encontrado")

    redis = await get_redis()
    existing_qids_json = await redis.get(_key_questions(scheduled_exam_id))

    if existing_qids_json and se.status == "started":
        # Resume existing session
        qids = json.loads(existing_qids_json)
        answers_json = await redis.get(_key_answers(scheduled_exam_id))
        marked_json = await redis.get(_key_marked(scheduled_exam_id))
        existing_answers = json.loads(answers_json) if answers_json else {}
        marked = json.loads(marked_json) if marked_json else []
        elapsed = int((utcnow() - se.start_time).total_seconds()) if se.start_time else 0
        questions = await _load_questions_with_options(qids, db)
        return StartExamResponse(
            scheduled_exam_id=scheduled_exam_id,
            exam_type=exam.exam_type or "quiz",
            subject=exam.subject,
            total_questions=exam.total_questions,
            duration_minutes=exam.duration_minutes,
            start_time=se.start_time or utcnow(),
            time_elapsed_seconds=elapsed,
            questions=questions,
            existing_answers=existing_answers,
            marked_questions=marked,
        )

    # Select questions
    q_query = select(Question)
    if exam.exam_type == "by_subject" and exam.subject:
        q_query = q_query.where(Question.subject == exam.subject)

    all_qs = (await db.exec(q_query)).all()
    n = min(exam.total_questions, len(all_qs))
    selected = random.sample(list(all_qs), n)
    qids = [str(q.id) for q in selected]

    # Store in Redis (TTL = duration + 1h buffer, questions live longer)
    answers_ttl = exam.duration_minutes * 60 + 3600
    await redis.setex(_key_questions(scheduled_exam_id), answers_ttl * 2, json.dumps(qids))
    await redis.setex(_key_answers(scheduled_exam_id), answers_ttl, json.dumps({}))
    await redis.setex(_key_marked(scheduled_exam_id), answers_ttl, json.dumps([]))

    now = utcnow()
    se.status = "started"
    se.start_time = now
    se.updated_at = now
    db.add(se)
    await db.commit()

    questions = await _load_questions_with_options(qids, db)
    return StartExamResponse(
        scheduled_exam_id=scheduled_exam_id,
        exam_type=exam.exam_type or "quiz",
        subject=exam.subject,
        total_questions=exam.total_questions,
        duration_minutes=exam.duration_minutes,
        start_time=now,
        time_elapsed_seconds=0,
        questions=questions,
        existing_answers={},
        marked_questions=[],
    )


async def _load_questions_with_options(qids: list[str], db: AsyncSession) -> list[QuestionForExam]:
    if not qids:
        return []
    q_uuids = [uuid.UUID(qid) for qid in qids]
    qs_result = await db.exec(select(Question).where(Question.id.in_(q_uuids)))  # type: ignore[arg-type]
    qs_map = {str(q.id): q for q in qs_result.all()}

    opts_result = await db.exec(
        select(QuestionOption)
        .where(QuestionOption.question_id.in_(q_uuids))  # type: ignore[arg-type]
        .order_by(QuestionOption.letter)  # type: ignore[arg-type]
    )
    opts_by_qid: dict[str, list[QuestionOption]] = {}
    for o in opts_result.all():
        opts_by_qid.setdefault(str(o.question_id), []).append(o)

    result = []
    for qid in qids:
        q = qs_map.get(qid)
        if not q:
            continue
        result.append(QuestionForExam(
            id=str(q.id),
            subject=q.subject or "",
            subject_label=SUBJECT_LABELS.get(q.subject or "", q.subject or ""),
            topic=q.topic,
            difficulty=q.difficulty,
            year=q.year,
            statement=q.statement,
            image_url=q.image_url,
            time_estimate_seconds=q.time_estimate_seconds,
            options=[QuestionOptionOut(letter=o.letter, text=o.text) for o in opts_by_qid.get(qid, [])],
        ))
    return result


# ── Save answer ────────────────────────────────────────────────────

async def save_answer(
    user: User,
    scheduled_exam_id: str,
    question_id: str,
    answer: str | None,
    db: AsyncSession,
) -> SaveAnswerResponse:
    await _check_exam_access(user, scheduled_exam_id, db)
    redis = await get_redis()
    key = _key_answers(scheduled_exam_id)

    answers_json = await redis.get(key)
    answers: dict[str, str] = json.loads(answers_json) if answers_json else {}

    if answer is None:
        answers.pop(question_id, None)
    else:
        answers[question_id] = answer

    # Refresh TTL on each save
    current_ttl = await redis.ttl(key)
    ttl = max(current_ttl, 3600) if current_ttl > 0 else 3600
    await redis.setex(key, ttl, json.dumps(answers))

    return SaveAnswerResponse(
        question_id=question_id,
        answer=answer,
        answers_count=len(answers),
    )


# ── Toggle mark ────────────────────────────────────────────────────

async def toggle_mark(
    user: User,
    scheduled_exam_id: str,
    question_id: str,
    db: AsyncSession,
) -> ToggleMarkResponse:
    await _check_exam_access(user, scheduled_exam_id, db)
    redis = await get_redis()
    key = _key_marked(scheduled_exam_id)

    marked_json = await redis.get(key)
    marked: list[str] = json.loads(marked_json) if marked_json else []

    if question_id in marked:
        marked.remove(question_id)
        is_marked = False
    else:
        marked.append(question_id)
        is_marked = True

    ttl = max(await redis.ttl(key), 3600)
    await redis.setex(key, ttl, json.dumps(marked))

    return ToggleMarkResponse(
        question_id=question_id,
        is_marked=is_marked,
        marked_count=len(marked),
    )


# ── Submit exam ────────────────────────────────────────────────────

async def submit_exam(
    user: User,
    scheduled_exam_id: str,
    db: AsyncSession,
) -> SubmitExamResponse:
    se_result = await db.exec(
        select(ScheduledExam)
        .where(ScheduledExam.id == uuid.UUID(scheduled_exam_id))
        .where(ScheduledExam.user_id == user.id)
    )
    se = se_result.first()
    if not se:
        raise HTTPException(status_code=404, detail="Simulado não encontrado")
    if se.status == "completed":
        result_r = await db.exec(
            select(ExamResult).where(ExamResult.scheduled_exam_id == se.id)
        )
        existing = result_r.first()
        if existing:
            return SubmitExamResponse(
                scheduled_exam_id=scheduled_exam_id, result_id=str(existing.id),
            )

    redis = await get_redis()
    qids_json = await redis.get(_key_questions(scheduled_exam_id))
    answers_json = await redis.get(_key_answers(scheduled_exam_id))

    if not qids_json:
        raise HTTPException(status_code=410, detail="Sessão expirada. Por favor, crie um novo simulado.")

    qids = json.loads(qids_json)
    answers: dict[str, str] = json.loads(answers_json) if answers_json else {}

    q_uuids = [uuid.UUID(qid) for qid in qids]
    qs_result = await db.exec(select(Question).where(Question.id.in_(q_uuids)))  # type: ignore[arg-type]
    questions = {str(q.id): q for q in qs_result.all()}

    correct_count = wrong_count = unanswered_count = 0
    perf: dict[str, dict] = {}
    exam_answers: list[dict] = []

    for qid in qids:
        q = questions.get(qid)
        if not q:
            continue
        subj = q.subject or "other"
        if subj not in perf:
            perf[subj] = {"total": 0, "correct": 0, "wrong": 0, "unanswered": 0}
        perf[subj]["total"] += 1

        user_answer = answers.get(qid)
        is_correct: bool | None = None
        if user_answer:
            is_correct = user_answer.upper() == (q.correct_answer or "").upper()
            if is_correct:
                correct_count += 1
                perf[subj]["correct"] += 1
            else:
                wrong_count += 1
                perf[subj]["wrong"] += 1
        else:
            unanswered_count += 1
            perf[subj]["unanswered"] += 1

        exam_answers.append({
            "question_id": q.id,
            "user_answer": user_answer,
            "correct_answer": q.correct_answer,
            "is_correct": is_correct,
            "topic": q.topic,
            "difficulty": q.difficulty,
        })

    total = len(qids)
    raw_score = int(correct_count / total * 100) if total > 0 else 0
    now = utcnow()
    actual_minutes = int((now - se.start_time).total_seconds() // 60) if se.start_time else 0

    result = ExamResult(
        user_id=user.id,
        scheduled_exam_id=se.id,
        exam_id=se.exam_id,
        total_questions=total,
        correct_answers=correct_count,
        wrong_answers=wrong_count,
        unanswered=unanswered_count,
        raw_score=raw_score,
        score_estimate=None,
        performance_by_subject=perf,
        completed_at=now,
    )
    db.add(result)
    await db.flush()

    for a in exam_answers:
        db.add(ExamAnswer(
            exam_result_id=result.id,
            question_id=a["question_id"],
            user_answer=a["user_answer"],
            correct_answer=a["correct_answer"],
            is_correct=a["is_correct"],
            topic=a["topic"],
            difficulty=a["difficulty"],
        ))

    se.status = "completed"
    se.end_time = now
    se.updated_at = now
    db.add(se)
    await db.commit()

    await redis.delete(_key_questions(scheduled_exam_id))
    await redis.delete(_key_answers(scheduled_exam_id))
    await redis.delete(_key_marked(scheduled_exam_id))

    # Calcular TRI de forma síncrona (pode ser movido para ARQ no Stage 3+)
    await db.refresh(result)
    await performance_service.calculate_tri_for_result(result, db)

    # XP por completar simulado
    try:
        from app.services.gamification_service import award_xp
        bonus = 100 if (result.raw_score or 0) > 80 else 0
        await award_xp(str(user.id), "exam_completed", 50 + bonus, db, scheduled_exam_id)
    except Exception:
        pass

    return SubmitExamResponse(scheduled_exam_id=scheduled_exam_id, result_id=str(result.id))


# ── Get result ─────────────────────────────────────────────────────

async def get_result(
    user: User,
    scheduled_exam_id: str,
    db: AsyncSession,
) -> ExamResultDetail:
    se_result = await db.exec(
        select(ScheduledExam)
        .where(ScheduledExam.id == uuid.UUID(scheduled_exam_id))
        .where(ScheduledExam.user_id == user.id)
    )
    se = se_result.first()
    if not se:
        raise HTTPException(status_code=404, detail="Simulado não encontrado")

    exam_r = await db.exec(select(Exam).where(Exam.id == se.exam_id))
    exam = exam_r.first()

    result_r = await db.exec(
        select(ExamResult).where(ExamResult.scheduled_exam_id == se.id)
    )
    result = result_r.first()
    if not result:
        raise HTTPException(status_code=404, detail="Resultado não disponível ainda")

    answers_r = await db.exec(
        select(ExamAnswer).where(ExamAnswer.exam_result_id == result.id)
    )
    exam_answers = list(answers_r.all())

    q_ids = [a.question_id for a in exam_answers]
    qs_result = await db.exec(select(Question).where(Question.id.in_(q_ids)))  # type: ignore[arg-type]
    qs_map = {q.id: q for q in qs_result.all()}

    opts_result = await db.exec(
        select(QuestionOption)
        .where(QuestionOption.question_id.in_(q_ids))  # type: ignore[arg-type]
        .order_by(QuestionOption.letter)  # type: ignore[arg-type]
    )
    opts_by_qid: dict = {}
    for o in opts_result.all():
        opts_by_qid.setdefault(o.question_id, []).append(o)

    perf_raw = result.performance_by_subject or {}
    perf_list = [
        SubjectPerf(
            subject=subj,
            subject_label=SUBJECT_LABELS.get(subj, subj),
            total=data.get("total", 0),
            correct=data.get("correct", 0),
            wrong=data.get("wrong", 0),
            unanswered=data.get("unanswered", 0),
            percentage=int(data["correct"] / data["total"] * 100) if data.get("total") else 0,
            tri_score=data.get("tri_score"),
        )
        for subj, data in perf_raw.items()
        if isinstance(data, dict)
    ]

    answer_details = [
        AnswerDetail(
            question_id=str(a.question_id),
            subject=qs_map[a.question_id].subject or "" if a.question_id in qs_map else "",
            subject_label=SUBJECT_LABELS.get(
                qs_map[a.question_id].subject or "" if a.question_id in qs_map else "", ""
            ),
            topic=a.topic,
            difficulty=a.difficulty,
            user_answer=a.user_answer,
            correct_answer=a.correct_answer or "",
            is_correct=a.is_correct,
            statement_preview=(
                qs_map[a.question_id].statement[:160] + "..."
                if a.question_id in qs_map and len(qs_map[a.question_id].statement) > 160
                else qs_map[a.question_id].statement if a.question_id in qs_map else ""
            ),
            options=[
                QuestionOptionOut(letter=o.letter, text=o.text)
                for o in opts_by_qid.get(a.question_id, [])
            ],
        )
        for a in exam_answers
    ]

    actual_minutes = int((result.completed_at - se.start_time).total_seconds() // 60) if se.start_time else 0

    return ExamResultDetail(
        scheduled_exam_id=scheduled_exam_id,
        result_id=str(result.id),
        exam_type=exam.exam_type if exam else "quiz",
        subject=exam.subject if exam else None,
        total_questions=result.total_questions or 0,
        correct_answers=result.correct_answers or 0,
        wrong_answers=result.wrong_answers or 0,
        unanswered=result.unanswered or 0,
        raw_score=result.raw_score or 0,
        score_estimate=result.score_estimate,
        completed_at=result.completed_at,
        duration_actual_minutes=actual_minutes,
        performance_by_subject=perf_list,
        answers=answer_details,
    )


# ── Helper ─────────────────────────────────────────────────────────

async def _check_exam_access(user: User, scheduled_exam_id: str, db: AsyncSession) -> ScheduledExam:
    result = await db.exec(
        select(ScheduledExam)
        .where(ScheduledExam.id == uuid.UUID(scheduled_exam_id))
        .where(ScheduledExam.user_id == user.id)
        .where(ScheduledExam.status == "started")
    )
    se = result.first()
    if not se:
        raise HTTPException(status_code=404, detail="Sessão de simulado não encontrada ou não iniciada")
    return se
