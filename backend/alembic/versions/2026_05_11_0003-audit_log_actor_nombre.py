"""Agrega actor_nombre a audit_log

Revision ID: 2026_05_11_0003
Revises: 2026_05_11_0002
Create Date: 2026-05-11

Guarda el nombre del inspector/admin al momento del cambio de estado.
Nullable para compatibilidad con entradas existentes.
"""

from alembic import op
import sqlalchemy as sa

revision = "2026_05_11_0003"
down_revision = "2026_05_11_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "audit_log",
        sa.Column("actor_nombre", sa.String(200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("audit_log", "actor_nombre")
