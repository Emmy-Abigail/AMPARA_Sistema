"""Fix CASCADE DELETE → SET NULL en reportes + índices de rendimiento

Revision ID: 2026_04_30_0001
Revises: 2026_04_29_0002
Create Date: 2026-04-30

Cambios:
1. reportes_app.usuario_id: ondelete CASCADE → SET NULL + columna nullable.
   Razón: los reportes son datos de salud pública — no deben eliminarse si
   se elimina la cuenta del ciudadano. Con SET NULL el reporte queda huérfano
   (usuario_id = NULL) pero el evento epidemiológico no se pierde.

2. Índice en fecha_reporte: todas las queries de dashboard filtran por fecha.
   Sin índice hace full-table-scan.

3. Índice en estado: el feed y los KPIs filtran por estado frecuentemente.

4. Índice GIST en ubicacion: habilita consultas espaciales eficientes con
   PostGIS (ST_DWithin, ST_Within, etc.) cuando el dashboard crezca.
   Sin este índice cada query geoespacial hace un seq-scan con cálculo por fila.
"""

from alembic import op
import sqlalchemy as sa


revision = "2026_04_30_0001"
down_revision = "2026_04_29_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Cambiar ondelete CASCADE → SET NULL ────────────────────────────────
    # Primero hacer la columna nullable (necesario antes de SET NULL).
    op.alter_column("reportes_app", "usuario_id", nullable=True)

    # Eliminar el constraint actual (nombre generado por SQLAlchemy/PG).
    op.drop_constraint(
        "reportes_app_usuario_id_fkey",
        "reportes_app",
        type_="foreignkey",
    )
    # Crear el nuevo con ON DELETE SET NULL.
    op.create_foreign_key(
        "reportes_app_usuario_id_fkey",
        "reportes_app",
        "usuarios",
        ["usuario_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # ── 2. Índice en fecha_reporte ────────────────────────────────────────────
    op.create_index(
        "ix_reportes_app_fecha_reporte",
        "reportes_app",
        ["fecha_reporte"],
    )

    # ── 3. Índice en estado ───────────────────────────────────────────────────
    op.create_index(
        "ix_reportes_app_estado",
        "reportes_app",
        ["estado"],
    )

    # ── 4. Índice GIST en columna geoespacial ─────────────────────────────────
    op.execute(
        "CREATE INDEX ix_reportes_app_ubicacion_gist "
        "ON reportes_app USING GIST (ubicacion) "
        "WHERE ubicacion IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_reportes_app_ubicacion_gist")
    op.drop_index("ix_reportes_app_estado", table_name="reportes_app")
    op.drop_index("ix_reportes_app_fecha_reporte", table_name="reportes_app")

    op.drop_constraint("reportes_app_usuario_id_fkey", "reportes_app", type_="foreignkey")
    op.create_foreign_key(
        "reportes_app_usuario_id_fkey",
        "reportes_app",
        "usuarios",
        ["usuario_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column("reportes_app", "usuario_id", nullable=False)
