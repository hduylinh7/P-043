"""add storage metadata to course materials

Revision ID: 0003
Revises: 0002_add_is_verified_to_user
Create Date: 2026-08-04

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002_add_is_verified_to_user"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("course_materials", sa.Column("object_key", sa.String(length=500), nullable=True))
    op.add_column("course_materials", sa.Column("bucket", sa.String(length=255), nullable=True))
    op.add_column("course_materials", sa.Column("size", sa.Integer(), nullable=True))
    op.add_column("course_materials", sa.Column("mime_type", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("course_materials", "mime_type")
    op.drop_column("course_materials", "size")
    op.drop_column("course_materials", "bucket")
    op.drop_column("course_materials", "object_key")
