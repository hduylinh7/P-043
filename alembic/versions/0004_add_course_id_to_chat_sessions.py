"""add course_id to chat_sessions

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-05

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("chat_sessions", sa.Column("course_id", sa.String(length=36), nullable=True))
    op.create_foreign_key("fk_chat_sessions_course_id", "chat_sessions", "courses", ["course_id"], ["id"], ondelete="CASCADE")
    op.create_index(op.f("ix_chat_sessions_course_id"), "chat_sessions", ["course_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_chat_sessions_course_id"), table_name="chat_sessions")
    op.drop_constraint("fk_chat_sessions_course_id", "chat_sessions", type_="foreignkey")
    op.drop_column("chat_sessions", "course_id")
