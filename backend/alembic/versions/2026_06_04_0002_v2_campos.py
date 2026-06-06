"""v2_campos — tipos_violencia array, factores_riesgo, descripcion, nivel_riesgo actualizado

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-04 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Nuevos campos en denuncias
    op.add_column("denuncias", sa.Column("tipos_violencia",  sa.Text(), nullable=True))
    op.add_column("denuncias", sa.Column("factores_riesgo",  sa.Text(), nullable=True))
    op.add_column("denuncias", sa.Column("descripcion",      sa.Text(), nullable=True))

    # Migrar registros v1: wrap tipo_violencia en JSON array
    op.execute("""
        UPDATE denuncias
        SET tipos_violencia = '["' || tipo_violencia || '"]'
        WHERE tipos_violencia IS NULL
    """)

    # El nivel_riesgo 'moderado' se mapea a 'medio' en display; la BD conserva el valor
    # para no romper filtros del dashboard existente. La lógica de display normaliza.

    # Nuevo campo autor 'usuaria' en mensajes_caso — no necesita ALTER (es string libre)

    # Índice para búsquedas por nivel_riesgo urgente/alto en el dashboard
    op.create_index("ix_denuncias_nivel_urgente", "denuncias", ["nivel_riesgo", "estado"])


def downgrade() -> None:
    op.drop_index("ix_denuncias_nivel_urgente", table_name="denuncias")
    op.drop_column("denuncias", "descripcion")
    op.drop_column("denuncias", "factores_riesgo")
    op.drop_column("denuncias", "tipos_violencia")
