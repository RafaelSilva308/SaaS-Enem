"""rename asaas_subscription_id to stripe_subscription_id

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-20
"""

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "subscriptions",
        "asaas_subscription_id",
        new_column_name="stripe_subscription_id",
    )


def downgrade() -> None:
    op.alter_column(
        "subscriptions",
        "stripe_subscription_id",
        new_column_name="asaas_subscription_id",
    )
