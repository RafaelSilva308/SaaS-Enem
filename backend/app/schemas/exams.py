from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel


class QuestionOptionOut(BaseModel):
    letter: str
    text: str


class QuestionForExam(BaseModel):
    id: str
    subject: str
    subject_label: str
    topic: str | None
    difficulty: str | None
    year: int | None
    statement: str
    image_url: str | None
    time_estimate_seconds: int
    options: list[QuestionOptionOut]


class CreateExamRequest(BaseModel):
    exam_type: Literal["complete", "by_subject", "quiz"]
    subject: str | None = None


class CreateExamResponse(BaseModel):
    scheduled_exam_id: str
    exam_type: str
    subject: str | None
    total_questions: int
    duration_minutes: int
    scheduled_at: datetime


class StartExamResponse(BaseModel):
    scheduled_exam_id: str
    exam_type: str
    subject: str | None
    total_questions: int
    duration_minutes: int
    start_time: datetime
    time_elapsed_seconds: int
    questions: list[QuestionForExam]
    existing_answers: dict[str, str]
    marked_questions: list[str]


class SaveAnswerRequest(BaseModel):
    question_id: str
    answer: str | None = None  # None to clear


class SaveAnswerResponse(BaseModel):
    question_id: str
    answer: str | None
    answers_count: int


class ToggleMarkRequest(BaseModel):
    question_id: str


class ToggleMarkResponse(BaseModel):
    question_id: str
    is_marked: bool
    marked_count: int


class SubmitExamResponse(BaseModel):
    scheduled_exam_id: str
    result_id: str


class SubjectPerf(BaseModel):
    subject: str
    subject_label: str
    total: int
    correct: int
    wrong: int
    unanswered: int
    percentage: int
    tri_score: int | None = None


class AnswerDetail(BaseModel):
    question_id: str
    subject: str
    subject_label: str
    topic: str | None
    difficulty: str | None
    user_answer: str | None
    correct_answer: str
    is_correct: bool | None
    statement_preview: str
    options: list[QuestionOptionOut]


class ExamResultDetail(BaseModel):
    scheduled_exam_id: str
    result_id: str
    exam_type: str
    subject: str | None
    total_questions: int
    correct_answers: int
    wrong_answers: int
    unanswered: int
    raw_score: int
    score_estimate: int | None
    completed_at: datetime
    duration_actual_minutes: int
    performance_by_subject: list[SubjectPerf]
    answers: list[AnswerDetail]


class ScheduledExamSummary(BaseModel):
    id: str
    exam_type: str
    subject: str | None
    total_questions: int
    duration_minutes: int
    status: str
    scheduled_at: datetime
    start_time: datetime | None
    end_time: datetime | None
    result_summary: dict[str, Any] | None
