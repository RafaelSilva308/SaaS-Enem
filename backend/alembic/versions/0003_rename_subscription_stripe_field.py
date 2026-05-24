"""rename asaas_subscription_id to stripe_subscription_id

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-20
"""

from alembic import op
from sqlalchemy import text

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Column may already be named stripe_subscription_id if 0001 was written post-migration
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='subscriptions' AND column_name='asaas_subscription_id'"
    ))
    if result.fetchone():
        op.alter_column("subscriptions", "asaas_subscription_id", new_column_name="stripe_subscription_id")


def downgrade() -> None:
    op.alter_column("subscriptions", "stripe_subscription_id", new_column_name="asaas_subscription_id")
