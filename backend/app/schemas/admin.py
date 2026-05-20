from pydantic import BaseModel


class DailyActivityItem(BaseModel):
    date: str       # YYYY-MM-DD
    sessions: int
    active_users: int


class TriBucket(BaseModel):
    label: str
    count: int


class SubPlanBucket(BaseModel):
    plan_type: str
    count: int


class AdminMetricsOut(BaseModel):
    total_users: int
    new_users_30d: int
    dau: int
    mau: int
    active_subscriptions: int
    mrr_brl: float
    essays_analyzed_30d: int
    exams_completed_30d: int
    churn_rate_pct: float
    sub_distribution: list[SubPlanBucket]
    tri_histogram: list[TriBucket]
    daily_activity: list[DailyActivityItem]


class AdminUserItem(BaseModel):
    id: str
    name: str
    email: str
    role: str
    account_status: str
    plan_type: str | None
    plan_status: str | None
    created_at: str


class AdminUsersResponse(BaseModel):
    items: list[AdminUserItem]
    total: int
    page: int
    per_page: int


class UserStatusUpdate(BaseModel):
    status: str     # active | suspended


class AdminQuestionOptionIn(BaseModel):
    letter: str     # A | B | C | D | E
    text: str


class AdminQuestionIn(BaseModel):
    source: str | None = None
    subject: str
    topic: str | None = None
    subtopic: str | None = None
    difficulty: str     # easy | medium | hard
    year: int | None = None
    statement: str
    correct_answer: str
    explanation: str | None = None
    options: list[AdminQuestionOptionIn]    # 5 options (A–E)


class AdminQuestionItem(BaseModel):
    id: str
    source: str | None
    subject: str | None
    topic: str | None
    difficulty: str | None
    year: int | None
    statement: str
    correct_answer: str | None
    options: list[AdminQuestionOptionIn]
    created_at: str


class AdminQuestionsResponse(BaseModel):
    items: list[AdminQuestionItem]
    total: int
    page: int
    per_page: int
