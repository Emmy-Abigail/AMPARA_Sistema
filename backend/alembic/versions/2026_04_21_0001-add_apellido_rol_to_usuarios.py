"""add apellido and rol to usuarios

Revision ID: a1b2c3d4e5f6
Revises: 0d75a9572da8
Create Date: 2026-04-21 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '0d75a9572da8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('apellido', sa.String(length=100), nullable=True))
    op.add_column('usuarios', sa.Column('rol', sa.String(length=50), nullable=False, server_default='ciudadano'))


def downgrade() -> None:
    op.drop_column('usuarios', 'rol')
    op.drop_column('usuarios', 'apellido')
