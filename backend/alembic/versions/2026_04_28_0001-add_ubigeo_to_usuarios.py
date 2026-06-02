"""add departamento and provincia to usuarios

Revision ID: 2026_04_28_0001
Revises: 2026_04_21_0003
Create Date: 2026-04-28

"""
from alembic import op
import sqlalchemy as sa

revision = '2026_04_28_0001'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('departamento', sa.String(100), nullable=True))
    op.add_column('usuarios', sa.Column('provincia', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('usuarios', 'provincia')
    op.drop_column('usuarios', 'departamento')
