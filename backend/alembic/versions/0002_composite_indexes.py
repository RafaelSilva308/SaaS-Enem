"""add composite indexes for high-volume queries

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-20
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # study_sessions: DAU/MAU queries + dashboard weekly activity
    op.create_index(
        "idx_study_sessions_user_time",
        "study_sessions",
        ["user_id", "start_time"],
    )

    # exam_results: TRI history + cohort queries
    op.create_index(
        "idx_exam_results_user_completed",
        "exam_results",
        ["user_id", "completed_at"],
    )

    # question_stats: recommended questions + doubt queries
    op.create_index(
        "idx_question_stats_user_question",
        "question_stats",
        ["user_id", "question_id"],
        unique=True,
    )

    # notifications: unread count + paginated list
    op.create_index(
        "idx_notifications_user_read_created",
        "notifications",
        ["user_id", "is_read", "created_at"],
    )

    # point_history: gamification history
    op.create_index(
        "idx_point_history_user_created",
        "point_history",
        ["user_id", "created_at"],
    )

    # essays: user essay list ordered by date
    op.create_index(
        "idx_essays_user_status",
        "essays",
        ["user_id", "status"],
    )

    # weekly_sprints: study plan loading
    op.create_index(
        "idx_weekly_sprints_plan_week",
        "weekly_sprints",
        ["study_plan_id", "week_number"],
    )

    # topics: completion status per sprint
    op.create_index(
        "idx_topics_sprint_completed",
        "topics",
        ["weekly_sprint_id", "is_completed"],
    )


def downgrade() -> None:
    op.drop_index("idx_study_sessions_user_time", "study_sessions")
    op.drop_index("idx_exam_results_user_completed", "exam_results")
    op.drop_index("idx_question_stats_user_question", "question_stats")
    op.drop_index("idx_notifications_user_read_created", "notifications")
    op.drop_index("idx_point_history_user_created", "point_history")
    op.drop_index("idx_essays_user_status", "essays")
    op.drop_index("idx_weekly_sprints_plan_week", "weekly_sprints")
    op.drop_index("idx_topics_sprint_completed", "topics")
