"""Audit log para cambios de estado en reportes

Revision ID: 2026_05_12_0001
Revises: 2026_04_30_0001
Create Date: 2026-05-12

Crea la tabla audit_log para trazabilidad de cambios de estado.
Requerido para sistemas gubernamentales de salud: registro inmutable
de quién cambió qué estado y cuándo.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "2026_05_12_0001"
down_revision = "2026_04_30_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_log",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "reporte_id",
            UUID(as_uuid=True),
            sa.ForeignKey("reportes_app.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "actor_id",
            UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("actor_email", sa.String(255), nullable=False),
        sa.Column("estado_anterior", sa.String(50), nullable=False),
        sa.Column("estado_nuevo", sa.String(50), nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_audit_log_reporte_id", "audit_log", ["reporte_id"])
    op.create_index("ix_audit_log_actor_id", "audit_log", ["actor_id"])
    op.create_index("ix_audit_log_timestamp", "audit_log", ["timestamp"])


def downgrade() -> None:
    op.drop_index("ix_audit_log_timestamp", table_name="audit_log")
    op.drop_index("ix_audit_log_actor_id", table_name="audit_log")
    op.drop_index("ix_audit_log_reporte_id", table_name="audit_log")
    op.drop_table("audit_log")
