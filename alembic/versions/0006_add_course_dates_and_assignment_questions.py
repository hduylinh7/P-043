"""add start_date and end_date to courses, available_from to assignments, and create assignment_questions and question_options tables

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-13

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add start_date and end_date to courses table
    op.add_column("courses", sa.Column("start_date", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False))
    op.add_column("courses", sa.Column("end_date", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False))

    # 2. Add available_from to assignments table
    op.add_column("assignments", sa.Column("available_from", sa.DateTime(timezone=True), nullable=True))

    # 3. Create assignment_questions table
    op.create_table(
        "assignment_questions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("assignment_id", sa.String(length=36), sa.ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("question_type", sa.String(length=50), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("points", sa.Float(), server_default="1.0", nullable=False),
        sa.Column("display_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("expected_answer", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # 4. Create question_options table
    op.create_table(
        "question_options",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("question_id", sa.String(length=36), sa.ForeignKey("assignment_questions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("option_text", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("display_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("question_options")
    op.drop_table("assignment_questions")
    op.drop_column("assignments", "available_from")
    op.drop_column("courses", "end_date")
    op.drop_column("courses", "start_date")
