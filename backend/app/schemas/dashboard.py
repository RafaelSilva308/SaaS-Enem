import uuid
from datetime import datetime
from pydantic import BaseModel


class CountdownData(BaseModel):
    days: int
    hours: int
    minutes: int
    seconds: int
    enem_date: str


class DailyGoalData(BaseModel):
    hours_goal: float
    hours_completed_today: float
    progress_percent: int
    is_study_day: bool


class WeeklyActivityItem(BaseModel):
    date: str
    day_label: str
    hours: float
    is_today: bool


class CurrentSprintData(BaseModel):
    week_number: int
    theme: str | None
    start_date: str
    end_date: str
    hours_allocated: float
    hours_completed: float
    progress_percent: int
    topics_total: int
    topics_completed: int


class RecommendationData(BaseModel):
    topic_id: str
    topic_name: str
    subject: str
    subject_label: str
    hours_allocated: float
    priority: str
    type: str


class NotificationItem(BaseModel):
    id: str
    type: str | None
    title: str | None
    message: str | None
    is_read: bool
    created_at: datetime


class DashboardResponse(BaseModel):
    countdown: CountdownData
    daily_goal: DailyGoalData
    weekly_activity: list[WeeklyActivityItem]
    current_sprint: CurrentSprintData | None
    next_exam: None
    recommendation: RecommendationData | None
    recent_notifications: list[NotificationItem]
    user_name: str


class StartSessionRequest(BaseModel):
    topic_id: str | None = None
    session_type: str = "theory"


class StartSessionResponse(BaseModel):
    session_id: str
    started_at: datetime


class EndSessionRequest(BaseModel):
    session_id: str


class EndSessionResponse(BaseModel):
    session_id: str
    duration_minutes: int
    hours_completed: float
    xp_earned: int
