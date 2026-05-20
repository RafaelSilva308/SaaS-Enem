from pydantic import BaseModel


class ContingencyStatusOut(BaseModel):
    plan_id: str
    is_contingency: bool
    delay_detected: bool
    severity: str           # ok | leve | moderado | severo
    expected_hours: float
    actual_hours: float
    hours_behind: float
    delay_percent: float
    days_behind: int
    health_score: int       # 0–100
    weakest_subject: str | None


class TurboOptionOut(BaseModel):
    id: str
    letter: str
    text: str


class TurboQuestionOut(BaseModel):
    id: str
    statement: str
    topic: str | None
    difficulty: str
    correct_answer: str
    options: list[TurboOptionOut]


class TurboSessionOut(BaseModel):
    subject: str
    subject_label: str
    topic_suggestion: str | None
    questions: list[TurboQuestionOut]
    time_limit_minutes: int
