"""Add is_verified to User model

Revision ID: 0002_add_is_verified_to_user
Revises: 0001_initial_schema
Create Date: 2026-08-02 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_add_is_verified_to_user'
down_revision: Union[str, None] = '0002_add_hashed_password'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade() -> None:
    op.drop_column('users', 'is_verified')
