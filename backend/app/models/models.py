import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from sqlmodel import Column, Field, SQLModel
from sqlalchemy import JSON, Text


def uuid_pk() -> uuid.UUID:
    return uuid.uuid4()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────────────
# 1. users
# ─────────────────────────────────────────────────────────────────
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    name: str = Field(max_length=255)
    email: str = Field(max_length=255, unique=True, index=True)
    password_hash: str = Field(max_length=255)
    date_of_birth: date
    email_verified: bool = Field(default=False)
    account_status: str = Field(default="active", max_length=50)  # active | suspended | deleted
    phone: str | None = Field(default=None, max_length=20)
    profile_picture_url: str | None = Field(default=None)
    totp_secret: str | None = Field(default=None)
    role: str = Field(default="student", max_length=20)  # student | teacher | admin
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    deleted_at: datetime | None = Field(default=None)


# ─────────────────────────────────────────────────────────────────
# 2. subscriptions
# ─────────────────────────────────────────────────────────────────
class Subscription(SQLModel, table=True):
    __tablename__ = "subscriptions"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    plan_type: str = Field(max_length=50)  # free | premium_1m | premium_3m | premium_6m | premium_trial
    status: str = Field(default="active", max_length=50)  # active | expired | cancelled
    start_date: datetime = Field(default_factory=utcnow)
    end_date: datetime
    payment_method: str | None = Field(default=None, max_length=50)
    amount_paid: Decimal | None = Field(default=None, decimal_places=2, max_digits=10)
    payment_id: str | None = Field(default=None, max_length=255)
    stripe_subscription_id: str | None = Field(default=None, max_length=255)
    auto_renewal: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 3. learning_profiles
# ─────────────────────────────────────────────────────────────────
class LearningProfile(SQLModel, table=True):
    __tablename__ = "learning_profiles"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, index=True)
    learning_style: str | None = Field(default=None, max_length=50)  # visual | auditory | kinesthetic
    preferred_time: str | None = Field(default=None, max_length=20)  # morning | afternoon | evening
    daily_hours_goal: Decimal = Field(default=Decimal("2.0"), decimal_places=1, max_digits=3)
    available_days: list[str] | None = Field(default=None, sa_column=Column(JSON))
    timezone: str = Field(default="America/Sao_Paulo", max_length=50)
    language: str = Field(default="pt-BR", max_length=10)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 4. diagnostics
# ─────────────────────────────────────────────────────────────────
class Diagnostic(SQLModel, table=True):
    __tablename__ = "diagnostics"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    linguagens_score: int | None = Field(default=None)
    matematica_score: int | None = Field(default=None)
    cn_score: int | None = Field(default=None)
    ch_score: int | None = Field(default=None)
    redacao_score: int | None = Field(default=None)
    estimated_hours: int | None = Field(default=None)
    weak_areas: list[dict] | None = Field(default=None, sa_column=Column(JSON))
    learning_profile: str | None = Field(default=None, max_length=50)
    completed_at: datetime = Field(default_factory=utcnow)
    created_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 5. study_plans
# ─────────────────────────────────────────────────────────────────
class StudyPlan(SQLModel, table=True):
    __tablename__ = "study_plans"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    diagnostic_id: uuid.UUID | None = Field(default=None, foreign_key="diagnostics.id")
    total_hours_available: int
    daily_hours_goal: Decimal = Field(default=Decimal("2.0"), decimal_places=1, max_digits=3)
    weeks_remaining: int | None = Field(default=None)
    status: str = Field(default="active", max_length=50)  # active | paused | completed
    is_contingency: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 6. weekly_sprints
# ─────────────────────────────────────────────────────────────────
class WeeklySprint(SQLModel, table=True):
    __tablename__ = "weekly_sprints"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    study_plan_id: uuid.UUID = Field(foreign_key="study_plans.id", index=True)
    week_number: int
    start_date: date
    end_date: date
    theme: str | None = Field(default=None, max_length=255)
    total_hours_allocated: Decimal | None = Field(default=None, decimal_places=1, max_digits=5)
    hours_completed: Decimal = Field(default=Decimal("0"), decimal_places=1, max_digits=5)
    status: str = Field(default="not_started", max_length=50)  # not_started | in_progress | completed
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 7. topics
# ─────────────────────────────────────────────────────────────────
class Topic(SQLModel, table=True):
    __tablename__ = "topics"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    weekly_sprint_id: uuid.UUID = Field(foreign_key="weekly_sprints.id", index=True)
    name: str = Field(max_length=255)
    subject: str | None = Field(default=None, max_length=100)  # linguagens | matematica | cn | ch
    hours_allocated: Decimal | None = Field(default=None, decimal_places=1, max_digits=3)
    type: str | None = Field(default=None, max_length=50)  # theory | practice | review
    priority: str | None = Field(default=None, max_length=50)  # low | medium | high | critical
    scheduled_days: list[str] | None = Field(default=None, sa_column=Column(JSON))
    is_completed: bool = Field(default=False)
    completed_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 8. essay_themes  (catalog — no FK)
# ─────────────────────────────────────────────────────────────────
class EssayTheme(SQLModel, table=True):
    __tablename__ = "essay_themes"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    title: str = Field(max_length=255)
    description: str | None = Field(default=None, sa_column=Column(Text))
    year: int | None = Field(default=None)
    source: str | None = Field(default=None, max_length=50)  # enem_official | suggested | custom
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 9. questions  (catalog — no user FK)
# ─────────────────────────────────────────────────────────────────
class Question(SQLModel, table=True):
    __tablename__ = "questions"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    source: str | None = Field(default=None, max_length=50, index=True)  # enem_2024 | custom
    subject: str | None = Field(default=None, max_length=100, index=True)
    topic: str | None = Field(default=None, max_length=255, index=True)
    subtopic: str | None = Field(default=None, max_length=255)
    difficulty: str | None = Field(default=None, max_length=50, index=True)  # easy | medium | hard
    year: int | None = Field(default=None, index=True)
    statement: str = Field(sa_column=Column(Text, nullable=False))
    image_url: str | None = Field(default=None)
    correct_answer: str | None = Field(default=None, max_length=10)
    explanation: str | None = Field(default=None, sa_column=Column(Text))
    explanation_video_url: str | None = Field(default=None)
    time_estimate_seconds: int = Field(default=180)
    tri_weight: Decimal = Field(default=Decimal("1.0"), decimal_places=2, max_digits=3)
    total_attempts: int = Field(default=0)
    correct_percentage: int = Field(default=0)
    times_answered_correctly: int = Field(default=0)
    related_topics: list[str] | None = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 10. question_options
# ─────────────────────────────────────────────────────────────────
class QuestionOption(SQLModel, table=True):
    __tablename__ = "question_options"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    question_id: uuid.UUID = Field(foreign_key="questions.id", index=True)
    letter: str = Field(max_length=1)
    text: str = Field(sa_column=Column(Text, nullable=False))
    position: int | None = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 11. exams  (catalog templates)
# ─────────────────────────────────────────────────────────────────
class Exam(SQLModel, table=True):
    __tablename__ = "exams"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    exam_type: str | None = Field(default=None, max_length=50, index=True)  # complete | by_subject | by_topic | quiz
    subject: str | None = Field(default=None, max_length=100)
    topic: str | None = Field(default=None, max_length=255)
    total_questions: int
    duration_minutes: int
    passing_score: int | None = Field(default=None)
    is_template: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 12. badges  (catalog)
# ─────────────────────────────────────────────────────────────────
class Badge(SQLModel, table=True):
    __tablename__ = "badges"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    name: str = Field(max_length=100, unique=True)
    description: str | None = Field(default=None, sa_column=Column(Text))
    icon_url: str | None = Field(default=None)
    condition_type: str | None = Field(default=None, max_length=100)
    condition_value: str | None = Field(default=None, max_length=255)
    tier: str | None = Field(default=None, max_length=50, index=True)  # bronze | silver | gold | platinum
    created_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 13. scheduled_exams
# ─────────────────────────────────────────────────────────────────
class ScheduledExam(SQLModel, table=True):
    __tablename__ = "scheduled_exams"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    exam_id: uuid.UUID = Field(foreign_key="exams.id")
    scheduled_at: datetime = Field(index=True)
    status: str = Field(default="scheduled", max_length=50, index=True)  # scheduled | started | completed | skipped
    start_time: datetime | None = Field(default=None)
    end_time: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 14. exam_results
# ─────────────────────────────────────────────────────────────────
class ExamResult(SQLModel, table=True):
    __tablename__ = "exam_results"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    scheduled_exam_id: uuid.UUID = Field(foreign_key="scheduled_exams.id", index=True)
    exam_id: uuid.UUID = Field(foreign_key="exams.id")
    total_questions: int | None = Field(default=None)
    correct_answers: int | None = Field(default=None)
    wrong_answers: int | None = Field(default=None)
    unanswered: int | None = Field(default=None)
    raw_score: int | None = Field(default=None)
    score_estimate: int | None = Field(default=None)  # TRI score 200–1000
    performance_by_subject: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    completed_at: datetime = Field(index=True)
    created_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 15. exam_answers
# ─────────────────────────────────────────────────────────────────
class ExamAnswer(SQLModel, table=True):
    __tablename__ = "exam_answers"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    exam_result_id: uuid.UUID = Field(foreign_key="exam_results.id", index=True)
    question_id: uuid.UUID = Field(foreign_key="questions.id", index=True)
    user_answer: str | None = Field(default=None, max_length=10)
    correct_answer: str | None = Field(default=None, max_length=10)
    is_correct: bool | None = Field(default=None, index=True)
    marked_as_doubt: bool = Field(default=False)
    time_spent_seconds: int | None = Field(default=None)
    topic: str | None = Field(default=None, max_length=255)
    difficulty: str | None = Field(default=None, max_length=50)
    created_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 16. essays
# ─────────────────────────────────────────────────────────────────
class Essay(SQLModel, table=True):
    __tablename__ = "essays"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    theme_id: uuid.UUID | None = Field(default=None, foreign_key="essay_themes.id")
    theme_title: str | None = Field(default=None, max_length=255)
    text: str = Field(sa_column=Column(Text, nullable=False))
    word_count: int | None = Field(default=None)
    line_count: int | None = Field(default=None)
    status: str = Field(default="draft", max_length=50, index=True)  # draft | submitted | under_review | reviewed
    is_from_simulado: bool = Field(default=False)
    simulado_id: uuid.UUID | None = Field(default=None)
    submitted_at: datetime | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 17. essay_analyses
# ─────────────────────────────────────────────────────────────────
class EssayAnalysis(SQLModel, table=True):
    __tablename__ = "essay_analyses"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    essay_id: uuid.UUID = Field(foreign_key="essays.id", unique=True, index=True)
    ai_score: int | None = Field(default=None)          # 0–1000
    competency1_score: int | None = Field(default=None)  # Domínio da escrita formal
    competency2_score: int | None = Field(default=None)  # Compreensão da proposta
    competency3_score: int | None = Field(default=None)  # Seleção de informações
    competency4_score: int | None = Field(default=None)  # Organização de ideias
    competency5_score: int | None = Field(default=None)  # Proposta de solução
    structural_feedback: str | None = Field(default=None, sa_column=Column(Text))
    argument_feedback: str | None = Field(default=None, sa_column=Column(Text))
    language_feedback: str | None = Field(default=None, sa_column=Column(Text))
    grammar_errors: list[dict] | None = Field(default=None, sa_column=Column(JSON))
    suggestions: list[str] | None = Field(default=None, sa_column=Column(JSON))
    analysed_at: datetime = Field(default_factory=utcnow)
    created_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 18. question_stats
# ─────────────────────────────────────────────────────────────────
class QuestionStat(SQLModel, table=True):
    __tablename__ = "question_stats"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    question_id: uuid.UUID = Field(foreign_key="questions.id", index=True)
    attempts: int = Field(default=0)
    correct: int = Field(default=0)
    wrong: int = Field(default=0)
    skipped: int = Field(default=0)
    average_time_seconds: int | None = Field(default=None)
    marked_as_doubt: bool = Field(default=False)
    last_attempted: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 19. user_badges  (M:N junction)
# ─────────────────────────────────────────────────────────────────
class UserBadge(SQLModel, table=True):
    __tablename__ = "user_badges"

    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True, index=True)
    badge_id: uuid.UUID = Field(foreign_key="badges.id", primary_key=True)
    unlocked_at: datetime = Field(default_factory=utcnow)
    created_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 23. notifications
# ─────────────────────────────────────────────────────────────────
class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    type: str | None = Field(default=None, max_length=100)
    title: str | None = Field(default=None, max_length=255)
    message: str | None = Field(default=None, sa_column=Column(Text))
    related_entity_type: str | None = Field(default=None, max_length=100)
    related_entity_id: uuid.UUID | None = Field(default=None)
    is_read: bool = Field(default=False, index=True)
    read_at: datetime | None = Field(default=None)
    delivery_status: dict[str, bool] | None = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utcnow, index=True)


# ─────────────────────────────────────────────────────────────────
# 24. study_sessions
# ─────────────────────────────────────────────────────────────────
class StudySession(SQLModel, table=True):
    __tablename__ = "study_sessions"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    topic_id: uuid.UUID | None = Field(default=None, foreign_key="topics.id")
    session_type: str | None = Field(default=None, max_length=50)  # theory | practice | review | quiz
    start_time: datetime = Field(index=True)
    end_time: datetime | None = Field(default=None)
    duration_minutes: int | None = Field(default=None)
    questions_attempted: int | None = Field(default=None)
    questions_correct: int | None = Field(default=None)
    session_score: int | None = Field(default=None)
    notes: str | None = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 25. user_streaks
# ─────────────────────────────────────────────────────────────────
class UserStreak(SQLModel, table=True):
    __tablename__ = "user_streaks"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, index=True)
    current_streak: int = Field(default=0)
    longest_streak: int = Field(default=0)
    last_studied_date: date | None = Field(default=None)
    streak_broken_count: int = Field(default=0)
    updated_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 26. user_points
# ─────────────────────────────────────────────────────────────────
class UserPoint(SQLModel, table=True):
    __tablename__ = "user_points"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, index=True)
    total_points: int = Field(default=0)
    current_level: int = Field(default=1, index=True)
    experience_points: int = Field(default=0)
    lifetime_points: int = Field(default=0)
    updated_at: datetime = Field(default_factory=utcnow)


# ─────────────────────────────────────────────────────────────────
# 27. point_history
# ─────────────────────────────────────────────────────────────────
class PointHistory(SQLModel, table=True):
    __tablename__ = "point_history"

    id: uuid.UUID = Field(default_factory=uuid_pk, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    action_type: str | None = Field(default=None, max_length=100)
    points_earned: int | None = Field(default=None)
    related_entity_id: uuid.UUID | None = Field(default=None)
    description: str | None = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=utcnow, index=True)
