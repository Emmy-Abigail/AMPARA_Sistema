"""agregar server_default true a es_activo en usuarios

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-21 00:03:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'usuarios', 'es_activo',
        existing_type=sa.Boolean(),
        server_default=sa.text('true'),
        existing_nullable=False,
    )
    # Activa cualquier usuario que haya quedado inactivo por falta de default
    op.execute("UPDATE usuarios SET es_activo = true WHERE es_activo = false")


def downgrade() -> None:
    op.alter_column(
        'usuarios', 'es_activo',
        existing_type=sa.Boolean(),
        server_default=None,
        existing_nullable=False,
    )
