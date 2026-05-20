from typing import Literal

from pydantic import BaseModel, field_validator


class QuestionOptionOut(BaseModel):
    letter: str
    text: str
    position: int | None = None


class QuestionOut(BaseModel):
    id: str
    subject: str
    topic: str | None
    difficulty: str | None
    statement: str
    image_url: str | None = None
    time_estimate_seconds: int = 180
    options: list[QuestionOptionOut]


class DiagnosticQuestionsResponse(BaseModel):
    questions: list[QuestionOut]
    total: int
    subjects: list[str]


class LearningProfileInput(BaseModel):
    learning_style: Literal["visual", "auditory", "kinesthetic"]
    preferred_time: Literal["morning", "afternoon", "evening"]
    daily_hours_goal: float = 2.0
    available_days: list[str]

    @field_validator("daily_hours_goal")
    @classmethod
    def validate_hours(cls, v: float) -> float:
        if not 0.5 <= v <= 12:
            raise ValueError("daily_hours_goal deve ser entre 0.5 e 12")
        return round(v, 1)

    @field_validator("available_days")
    @classmethod
    def validate_days(cls, v: list[str]) -> list[str]:
        valid = {"seg", "ter", "qua", "qui", "sex", "sab", "dom"}
        for d in v:
            if d.lower() not in valid:
                raise ValueError(f"Dia inválido: {d}. Use: seg, ter, qua, qui, sex, sab, dom")
        return [d.lower() for d in v]


class DiagnosticAnswer(BaseModel):
    question_id: str
    answer: str                  # A | B | C | D | E


class DiagnosticSubmitRequest(BaseModel):
    learning_profile: LearningProfileInput
    answers: list[DiagnosticAnswer]


class SubjectScore(BaseModel):
    subject: str
    label: str
    score: int                   # 0–100
    correct: int
    total: int
    level: str                   # weak | moderate | strong


class WeakArea(BaseModel):
    subject: str
    label: str
    score: int
    recommendation: str


class DiagnosticResult(BaseModel):
    diagnostic_id: str
    scores: list[SubjectScore]
    weak_areas: list[WeakArea]
    estimated_hours: int
    overall_score: int
    learning_profile: str


class DiagnosticStatusResponse(BaseModel):
    has_completed: bool
    diagnostic_id: str | None = None
