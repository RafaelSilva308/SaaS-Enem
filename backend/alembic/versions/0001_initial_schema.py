"""initial schema — 27 tables

Revision ID: 0001
Revises:
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. users ──────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("email_verified", sa.Boolean(), server_default="false"),
        sa.Column("account_status", sa.String(50), server_default="active"),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("profile_picture_url", sa.Text(), nullable=True),
        sa.Column("totp_secret", sa.String(255), nullable=True),
        sa.Column("role", sa.String(20), server_default="student"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("idx_users_email", "users", ["email"], unique=True)
    op.create_index("idx_users_status", "users", ["account_status"])

    # ── 2. subscriptions ──────────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plan_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), server_default="active"),
        sa.Column("start_date", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("end_date", sa.DateTime(), nullable=False),
        sa.Column("payment_method", sa.String(50), nullable=True),
        sa.Column("amount_paid", sa.Numeric(10, 2), nullable=True),
        sa.Column("payment_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("auto_renewal", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_subscriptions_user", "subscriptions", ["user_id"])
    op.create_index("idx_subscriptions_status", "subscriptions", ["status"])
    op.create_index("idx_subscriptions_end_date", "subscriptions", ["end_date"])

    # ── 3. learning_profiles ──────────────────────────────────────
    op.create_table(
        "learning_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("learning_style", sa.String(50), nullable=True),
        sa.Column("preferred_time", sa.String(20), nullable=True),
        sa.Column("daily_hours_goal", sa.Numeric(3, 1), server_default="2.0"),
        sa.Column("available_days", postgresql.JSONB(), nullable=True),
        sa.Column("timezone", sa.String(50), server_default="America/Sao_Paulo"),
        sa.Column("language", sa.String(10), server_default="pt-BR"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_learning_profiles_user", "learning_profiles", ["user_id"])

    # ── 4. diagnostics ────────────────────────────────────────────
    op.create_table(
        "diagnostics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("linguagens_score", sa.Integer(), nullable=True),
        sa.Column("matematica_score", sa.Integer(), nullable=True),
        sa.Column("cn_score", sa.Integer(), nullable=True),
        sa.Column("ch_score", sa.Integer(), nullable=True),
        sa.Column("redacao_score", sa.Integer(), nullable=True),
        sa.Column("estimated_hours", sa.Integer(), nullable=True),
        sa.Column("weak_areas", postgresql.JSONB(), nullable=True),
        sa.Column("learning_profile", sa.String(50), nullable=True),
        sa.Column("completed_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_diagnostics_user", "diagnostics", ["user_id"])
    op.create_index("idx_diagnostics_completed", "diagnostics", ["completed_at"])

    # ── 5. study_plans ────────────────────────────────────────────
    op.create_table(
        "study_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("diagnostic_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("diagnostics.id", ondelete="SET NULL"), nullable=True),
        sa.Column("total_hours_available", sa.Integer(), nullable=False),
        sa.Column("daily_hours_goal", sa.Numeric(3, 1), server_default="2.0"),
        sa.Column("weeks_remaining", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(50), server_default="active"),
        sa.Column("is_contingency", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_study_plans_user", "study_plans", ["user_id"])
    op.create_index("idx_study_plans_status", "study_plans", ["status"])

    # ── 6. weekly_sprints ─────────────────────────────────────────
    op.create_table(
        "weekly_sprints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("study_plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("study_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("theme", sa.String(255), nullable=True),
        sa.Column("total_hours_allocated", sa.Numeric(5, 1), nullable=True),
        sa.Column("hours_completed", sa.Numeric(5, 1), server_default="0"),
        sa.Column("status", sa.String(50), server_default="not_started"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_weekly_sprints_plan", "weekly_sprints", ["study_plan_id"])
    op.create_index("idx_weekly_sprints_dates", "weekly_sprints", ["start_date", "end_date"])
    op.create_index("idx_weekly_sprints_user_dates", "weekly_sprints", ["study_plan_id", "start_date", "end_date"])

    # ── 7. topics ─────────────────────────────────────────────────
    op.create_table(
        "topics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("weekly_sprint_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("weekly_sprints.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("subject", sa.String(100), nullable=True),
        sa.Column("hours_allocated", sa.Numeric(3, 1), nullable=True),
        sa.Column("type", sa.String(50), nullable=True),
        sa.Column("priority", sa.String(50), nullable=True),
        sa.Column("scheduled_days", postgresql.JSONB(), nullable=True),
        sa.Column("is_completed", sa.Boolean(), server_default="false"),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_topics_sprint", "topics", ["weekly_sprint_id"])
    op.create_index("idx_topics_subject", "topics", ["subject"])

    # ── 8. essay_themes ───────────────────────────────────────────
    op.create_table(
        "essay_themes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_essay_themes_active", "essay_themes", ["is_active"])
    op.create_index("idx_essay_themes_year", "essay_themes", ["year"])

    # ── 9. questions ──────────────────────────────────────────────
    op.create_table(
        "questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column("subject", sa.String(100), nullable=True),
        sa.Column("topic", sa.String(255), nullable=True),
        sa.Column("subtopic", sa.String(255), nullable=True),
        sa.Column("difficulty", sa.String(50), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("correct_answer", sa.String(10), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("explanation_video_url", sa.Text(), nullable=True),
        sa.Column("time_estimate_seconds", sa.Integer(), server_default="180"),
        sa.Column("tri_weight", sa.Numeric(3, 2), server_default="1.0"),
        sa.Column("total_attempts", sa.Integer(), server_default="0"),
        sa.Column("correct_percentage", sa.Integer(), server_default="0"),
        sa.Column("times_answered_correctly", sa.Integer(), server_default="0"),
        sa.Column("related_topics", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_questions_subject", "questions", ["subject"])
    op.create_index("idx_questions_topic", "questions", ["topic"])
    op.create_index("idx_questions_difficulty", "questions", ["difficulty"])
    op.create_index("idx_questions_year", "questions", ["year"])
    op.create_index("idx_questions_source_year", "questions", ["source", "year"])

    # ── 10. question_options ──────────────────────────────────────
    op.create_table(
        "question_options",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("letter", sa.String(1), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.UniqueConstraint("question_id", "letter", name="uq_question_option_letter"),
    )
    op.create_index("idx_question_options_question", "question_options", ["question_id"])

    # ── 11. exams ─────────────────────────────────────────────────
    op.create_table(
        "exams",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("exam_type", sa.String(50), nullable=True),
        sa.Column("subject", sa.String(100), nullable=True),
        sa.Column("topic", sa.String(255), nullable=True),
        sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("passing_score", sa.Integer(), nullable=True),
        sa.Column("is_template", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_exams_type", "exams", ["exam_type"])

    # ── 12. badges ────────────────────────────────────────────────
    op.create_table(
        "badges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon_url", sa.Text(), nullable=True),
        sa.Column("condition_type", sa.String(100), nullable=True),
        sa.Column("condition_value", sa.String(255), nullable=True),
        sa.Column("tier", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_badges_tier", "badges", ["tier"])

    # ── 13. scheduled_exams ───────────────────────────────────────
    op.create_table(
        "scheduled_exams",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("exam_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(50), server_default="scheduled"),
        sa.Column("start_time", sa.DateTime(), nullable=True),
        sa.Column("end_time", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_scheduled_exams_user", "scheduled_exams", ["user_id"])
    op.create_index("idx_scheduled_exams_scheduled", "scheduled_exams", ["scheduled_at"])
    op.create_index("idx_scheduled_exams_status", "scheduled_exams", ["status"])
    op.create_index("idx_scheduled_exams_user_scheduled", "scheduled_exams", ["user_id", "scheduled_at"])

    # ── 14. exam_results ──────────────────────────────────────────
    op.create_table(
        "exam_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scheduled_exam_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("scheduled_exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("exam_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=True),
        sa.Column("correct_answers", sa.Integer(), nullable=True),
        sa.Column("wrong_answers", sa.Integer(), nullable=True),
        sa.Column("unanswered", sa.Integer(), nullable=True),
        sa.Column("raw_score", sa.Integer(), nullable=True),
        sa.Column("score_estimate", sa.Integer(), nullable=True),
        sa.Column("performance_by_subject", postgresql.JSONB(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_exam_results_user", "exam_results", ["user_id"])
    op.create_index("idx_exam_results_scheduled", "exam_results", ["scheduled_exam_id"])
    op.create_index("idx_exam_results_completed", "exam_results", ["completed_at"])
    op.create_index("idx_exam_results_user_completed", "exam_results", ["user_id", "completed_at"])

    # ── 15. exam_answers ──────────────────────────────────────────
    op.create_table(
        "exam_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("exam_result_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exam_results.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_answer", sa.String(10), nullable=True),
        sa.Column("correct_answer", sa.String(10), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("marked_as_doubt", sa.Boolean(), server_default="false"),
        sa.Column("time_spent_seconds", sa.Integer(), nullable=True),
        sa.Column("topic", sa.String(255), nullable=True),
        sa.Column("difficulty", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_exam_answers_result", "exam_answers", ["exam_result_id"])
    op.create_index("idx_exam_answers_question", "exam_answers", ["question_id"])
    op.create_index("idx_exam_answers_correct", "exam_answers", ["is_correct"])
    op.create_index("idx_exam_answers_question_correct", "exam_answers", ["question_id", "is_correct"])

    # ── 16. essays ────────────────────────────────────────────────
    op.create_table(
        "essays",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("theme_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("essay_themes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("theme_title", sa.String(255), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("word_count", sa.Integer(), nullable=True),
        sa.Column("line_count", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(50), server_default="draft"),
        sa.Column("is_from_simulado", sa.Boolean(), server_default="false"),
        sa.Column("simulado_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_essays_user", "essays", ["user_id"])
    op.create_index("idx_essays_status", "essays", ["status"])
    op.create_index("idx_essays_submitted", "essays", ["submitted_at"])

    # ── 17. essay_analyses ────────────────────────────────────────
    op.create_table(
        "essay_analyses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("essay_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("essays.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("ai_score", sa.Integer(), nullable=True),
        sa.Column("competency1_score", sa.Integer(), nullable=True),
        sa.Column("competency2_score", sa.Integer(), nullable=True),
        sa.Column("competency3_score", sa.Integer(), nullable=True),
        sa.Column("competency4_score", sa.Integer(), nullable=True),
        sa.Column("competency5_score", sa.Integer(), nullable=True),
        sa.Column("structural_feedback", sa.Text(), nullable=True),
        sa.Column("argument_feedback", sa.Text(), nullable=True),
        sa.Column("language_feedback", sa.Text(), nullable=True),
        sa.Column("grammar_errors", postgresql.JSONB(), nullable=True),
        sa.Column("suggestions", postgresql.JSONB(), nullable=True),
        sa.Column("analysed_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_essay_analyses_essay", "essay_analyses", ["essay_id"])

    # ── 18. question_stats ────────────────────────────────────────
    op.create_table(
        "question_stats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0"),
        sa.Column("correct", sa.Integer(), server_default="0"),
        sa.Column("wrong", sa.Integer(), server_default="0"),
        sa.Column("skipped", sa.Integer(), server_default="0"),
        sa.Column("average_time_seconds", sa.Integer(), nullable=True),
        sa.Column("marked_as_doubt", sa.Boolean(), server_default="false"),
        sa.Column("last_attempted", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "question_id", name="uq_question_stats_user_question"),
    )
    op.create_index("idx_question_stats_user", "question_stats", ["user_id"])
    op.create_index("idx_question_stats_question", "question_stats", ["question_id"])

    # ── 19. community_posts ───────────────────────────────────────
    op.create_table(
        "community_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("view_count", sa.Integer(), server_default="0"),
        sa.Column("reply_count", sa.Integer(), server_default="0"),
        sa.Column("helpful_count", sa.Integer(), server_default="0"),
        sa.Column("status", sa.String(50), server_default="published"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("idx_community_posts_user", "community_posts", ["user_id"])
    op.create_index("idx_community_posts_category", "community_posts", ["category"])
    op.create_index("idx_community_posts_status", "community_posts", ["status"])
    op.create_index("idx_community_posts_created", "community_posts", ["created_at"])
    op.create_index("idx_community_posts_user_created", "community_posts", ["user_id", "created_at"])

    # ── 20. community_replies ─────────────────────────────────────
    op.create_table(
        "community_replies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_reply_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("community_replies.id", ondelete="CASCADE"), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_solution", sa.Boolean(), server_default="false"),
        sa.Column("is_teacher_reply", sa.Boolean(), server_default="false"),
        sa.Column("helpful_count", sa.Integer(), server_default="0"),
        sa.Column("status", sa.String(50), server_default="published"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("idx_community_replies_post", "community_replies", ["post_id"])
    op.create_index("idx_community_replies_user", "community_replies", ["user_id"])
    op.create_index("idx_community_replies_solution", "community_replies", ["is_solution"])

    # ── 21. mentoring_sessions ────────────────────────────────────
    op.create_table(
        "mentoring_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("topic", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), server_default="scheduled"),
        sa.Column("start_time", sa.DateTime(), nullable=True),
        sa.Column("end_time", sa.DateTime(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("video_url", sa.Text(), nullable=True),
        sa.Column("recording_url", sa.Text(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("student_rating", sa.Integer(), nullable=True),
        sa.Column("student_feedback", sa.Text(), nullable=True),
        sa.Column("price", sa.Numeric(8, 2), nullable=True),
        sa.Column("payment_status", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_mentoring_sessions_student", "mentoring_sessions", ["student_id"])
    op.create_index("idx_mentoring_sessions_teacher", "mentoring_sessions", ["teacher_id"])
    op.create_index("idx_mentoring_sessions_scheduled", "mentoring_sessions", ["scheduled_at"])

    # ── 22. user_badges ───────────────────────────────────────────
    op.create_table(
        "user_badges",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("badge_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("badges.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("unlocked_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_user_badges_user", "user_badges", ["user_id"])

    # ── 23. notifications ─────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(100), nullable=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("related_entity_type", sa.String(100), nullable=True),
        sa.Column("related_entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default="false"),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("delivery_status", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_notifications_user", "notifications", ["user_id"])
    op.create_index("idx_notifications_read", "notifications", ["is_read"])
    op.create_index("idx_notifications_created", "notifications", ["created_at"])

    # ── 24. study_sessions ────────────────────────────────────────
    op.create_table(
        "study_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("topics.id", ondelete="SET NULL"), nullable=True),
        sa.Column("session_type", sa.String(50), nullable=True),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("questions_attempted", sa.Integer(), nullable=True),
        sa.Column("questions_correct", sa.Integer(), nullable=True),
        sa.Column("session_score", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_study_sessions_user", "study_sessions", ["user_id"])
    op.create_index("idx_study_sessions_start", "study_sessions", ["start_time"])
    op.create_index("idx_study_sessions_user_date", "study_sessions", ["user_id", "start_time"])

    # ── 25. user_streaks ──────────────────────────────────────────
    op.create_table(
        "user_streaks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("current_streak", sa.Integer(), server_default="0"),
        sa.Column("longest_streak", sa.Integer(), server_default="0"),
        sa.Column("last_studied_date", sa.Date(), nullable=True),
        sa.Column("streak_broken_count", sa.Integer(), server_default="0"),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_user_streaks_user", "user_streaks", ["user_id"])

    # ── 26. user_points ───────────────────────────────────────────
    op.create_table(
        "user_points",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("total_points", sa.Integer(), server_default="0"),
        sa.Column("current_level", sa.Integer(), server_default="1"),
        sa.Column("experience_points", sa.Integer(), server_default="0"),
        sa.Column("lifetime_points", sa.Integer(), server_default="0"),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_user_points_user", "user_points", ["user_id"])
    op.create_index("idx_user_points_level", "user_points", ["current_level"])

    # ── 27. point_history ─────────────────────────────────────────
    op.create_table(
        "point_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action_type", sa.String(100), nullable=True),
        sa.Column("points_earned", sa.Integer(), nullable=True),
        sa.Column("related_entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("idx_point_history_user", "point_history", ["user_id"])
    op.create_index("idx_point_history_created", "point_history", ["created_at"])


def downgrade() -> None:
    # Drop na ordem inversa das dependências
    op.drop_table("point_history")
    op.drop_table("user_points")
    op.drop_table("user_streaks")
    op.drop_table("study_sessions")
    op.drop_table("notifications")
    op.drop_table("user_badges")
    op.drop_table("mentoring_sessions")
    op.drop_table("community_replies")
    op.drop_table("community_posts")
    op.drop_table("question_stats")
    op.drop_table("essay_analyses")
    op.drop_table("essays")
    op.drop_table("exam_answers")
    op.drop_table("exam_results")
    op.drop_table("scheduled_exams")
    op.drop_table("badges")
    op.drop_table("exams")
    op.drop_table("question_options")
    op.drop_table("questions")
    op.drop_table("essay_themes")
    op.drop_table("topics")
    op.drop_table("weekly_sprints")
    op.drop_table("study_plans")
    op.drop_table("diagnostics")
    op.drop_table("learning_profiles")
    op.drop_table("subscriptions")
    op.drop_table("users")
