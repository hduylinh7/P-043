"""refactor weekly_goals and tasks for weekly plan module

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-11

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add week_end_date to weekly_goals
    op.add_column("weekly_goals", sa.Column("week_end_date", sa.DateTime(timezone=True), nullable=True))

    # 2. Add scheduled_date, start_time, end_time, source_type, source_id to tasks
    op.add_column("tasks", sa.Column("scheduled_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tasks", sa.Column("start_time", sa.String(length=10), nullable=True))
    op.add_column("tasks", sa.Column("end_time", sa.String(length=10), nullable=True))
    op.add_column("tasks", sa.Column("source_type", sa.String(length=50), server_default="MANUAL", nullable=False))
    op.add_column("tasks", sa.Column("source_id", sa.String(length=36), nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "source_id")
    op.drop_column("tasks", "source_type")
    op.drop_column("tasks", "end_time")
    op.drop_column("tasks", "start_time")
    op.drop_column("tasks", "scheduled_date")
    op.drop_column("weekly_goals", "week_end_date")
