"""add push_token to usuarios

Revision ID: 2026_04_29_0001
Revises: 2026_04_28_0001
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa

revision = '2026_04_29_0001'
down_revision = '2026_04_28_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('push_token', sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column('usuarios', 'push_token')
