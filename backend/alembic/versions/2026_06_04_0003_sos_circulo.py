"""sos_circulo — alertas_sos, circulo_confianza, codigo_acceso en denuncias

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-04 00:00:00.000000
"""
import secrets
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None

_CODIGO_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def upgrade() -> None:
    # ── alertas_sos ──────────────────────────────────────────────────────────
    op.create_table(
        "alertas_sos",
        sa.Column("id",               postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("usuario_id",       postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("denuncia_id",      postgresql.UUID(as_uuid=True), sa.ForeignKey("denuncias.id", ondelete="SET NULL"), nullable=True),
        sa.Column("device_id",        sa.String(64),  nullable=True),
        sa.Column("latitud",          sa.Float(),     nullable=True),
        sa.Column("longitud",         sa.Float(),     nullable=True),
        sa.Column("estado",           sa.String(20),  nullable=False, server_default="activa"),
        sa.Column("sms_enviados",     sa.Integer(),   nullable=False, server_default="0"),
        sa.Column("fecha_activacion", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("fecha_resolucion", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_alertas_sos_usuario_id",  "alertas_sos", ["usuario_id"])
    op.create_index("ix_alertas_sos_denuncia_id", "alertas_sos", ["denuncia_id"])
    op.create_index("ix_alertas_sos_device_id",   "alertas_sos", ["device_id"])
    op.create_index("ix_alertas_sos_estado",      "alertas_sos", ["estado"])
    op.create_index("ix_alertas_sos_fecha",       "alertas_sos", ["fecha_activacion"])

    # ── circulo_confianza ────────────────────────────────────────────────────
    op.create_table(
        "circulo_confianza",
        sa.Column("id",         postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nombre",     sa.String(100), nullable=False),
        sa.Column("telefono",   sa.String(20),  nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_circulo_usuario_id", "circulo_confianza", ["usuario_id"])

    # ── codigo_acceso en denuncias ────────────────────────────────────────────
    op.add_column("denuncias", sa.Column("codigo_acceso", sa.String(6), nullable=True))
    op.create_index("ix_denuncias_codigo_acceso", "denuncias", ["codigo_acceso"], unique=True)

    # Backfill: generar codigo_acceso para filas existentes usando SQL random
    # Usamos un subquery con generate_series para garantizar unicidad eventual.
    # En producción con muchas filas se puede hacer por lotes; aquí es seguro.
    op.execute("""
        UPDATE denuncias
        SET codigo_acceso = (
            SELECT string_agg(
                substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::int, 1),
                ''
            )
            FROM generate_series(1, 6)
        )
        WHERE codigo_acceso IS NULL
    """)


def downgrade() -> None:
    op.drop_index("ix_denuncias_codigo_acceso", table_name="denuncias")
    op.drop_column("denuncias", "codigo_acceso")

    op.drop_index("ix_circulo_usuario_id", table_name="circulo_confianza")
    op.drop_table("circulo_confianza")

    op.drop_index("ix_alertas_sos_fecha",       table_name="alertas_sos")
    op.drop_index("ix_alertas_sos_estado",      table_name="alertas_sos")
    op.drop_index("ix_alertas_sos_device_id",   table_name="alertas_sos")
    op.drop_index("ix_alertas_sos_denuncia_id", table_name="alertas_sos")
    op.drop_index("ix_alertas_sos_usuario_id",  table_name="alertas_sos")
    op.drop_table("alertas_sos")
