"""ampliar observa_larvas y conocimiento_dengue_cercano a varchar(50)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-21 00:02:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'reportes_app', 'observa_larvas',
        existing_type=sa.String(10),
        type_=sa.String(50),
        existing_nullable=False,
    )
    op.alter_column(
        'reportes_app', 'conocimiento_dengue_cercano',
        existing_type=sa.String(10),
        type_=sa.String(50),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        'reportes_app', 'conocimiento_dengue_cercano',
        existing_type=sa.String(50),
        type_=sa.String(10),
        existing_nullable=True,
    )
    op.alter_column(
        'reportes_app', 'observa_larvas',
        existing_type=sa.String(50),
        type_=sa.String(10),
        existing_nullable=False,
    )
