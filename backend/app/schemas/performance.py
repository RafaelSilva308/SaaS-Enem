from datetime import datetime
from pydantic import BaseModel


# ── Stage 2.4 ──────────────────────────────────────────────────────

class OverviewData(BaseModel):
    hours_studied: float
    questions_answered: int
    accuracy_rate: int       # 0–100 %
    current_streak: int
    exams_completed: int
    topics_completed: int
    topics_total: int
    plan_progress: int       # 0–100 %


class ErrorPattern(BaseModel):
    type: str
    description: str
    count: int
    percentage: int
    color: str


class ErrorPatternsData(BaseModel):
    total_wrong: int
    total_unanswered: int
    patterns: list[ErrorPattern]


class WeakTopic(BaseModel):
    topic: str
    attempts: int
    correct: int
    accuracy: int


class SubjectDeepDiveData(BaseModel):
    subject: str
    subject_label: str
    accuracy_rate: int
    questions_answered: int
    questions_correct: int
    weak_topics: list[WeakTopic]
    tri_history: list[int]
    recent_trend: str        # up | down | stable


class ComparisonData(BaseModel):
    user_scores: dict[str, int]   # subject → accuracy %
    national_avg: dict[str, int]  # subject → accuracy %
    percentile: int               # 1–99


class TRIHistoryItem(BaseModel):
    exam_id: str
    scheduled_exam_id: str
    exam_type: str
    subject: str | None
    completed_at: datetime
    overall_tri: int | None
    raw_score: int
    tri_by_subject: dict[str, int]  # subject → TRI score


class TRIHistoryResponse(BaseModel):
    history: list[TRIHistoryItem]
    data_points: int


class SubjectPrediction(BaseModel):
    subject: str
    subject_label: str
    projected: int
    confidence_low: int
    confidence_high: int
    trend: str  # up | down | stable


class ENEMPredictionResponse(BaseModel):
    projected_score: int | None
    confidence_low: int | None
    confidence_high: int | None
    by_subject: dict[str, SubjectPrediction]
    data_points: int
    has_enough_data: bool
    message: str | None = None
