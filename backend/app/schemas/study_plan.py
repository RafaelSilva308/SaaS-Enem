from pydantic import BaseModel


class TopicResponse(BaseModel):
    id: str
    name: str
    subject: str
    subject_label: str
    hours_allocated: float
    type: str           # theory | practice | review
    priority: str       # critical | high | medium | low
    scheduled_days: list[str]
    is_completed: bool
    completed_at: str | None = None


class SprintSummary(BaseModel):
    id: str
    week_number: int
    start_date: str
    end_date: str
    theme: str | None
    total_hours_allocated: float
    hours_completed: float
    status: str         # not_started | in_progress | completed
    progress_percentage: int
    topics: list[TopicResponse]


class SubjectProgress(BaseModel):
    subject: str
    label: str
    color: str
    topics_completed: int
    topics_total: int
    hours_completed: float
    hours_total: float
    percentage: int


class StudyPlanResponse(BaseModel):
    plan_id: str
    status: str
    daily_hours_goal: float
    weeks_remaining: int
    total_weeks: int
    enem_date: str
    overall_progress: int
    current_sprint: SprintSummary | None
    next_sprint: SprintSummary | None
    subjects_progress: list[SubjectProgress]
    all_sprints: list[SprintSummary]       # limitado a 4 semanas no freemium


class GeneratePlanRequest(BaseModel):
    force_regenerate: bool = False         # recriar mesmo se já existir


class AdjustPlanRequest(BaseModel):
    daily_hours_goal: float
    available_days: list[str]


class CompleteTopicResponse(BaseModel):
    topic_id: str
    is_completed: bool
    xp_earned: int
    sprint_progress: int
