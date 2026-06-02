"""Agrega columna direccion a reportes_app

Revision ID: 2026_05_11_0002
Revises: 2026_05_12_0001
Create Date: 2026-05-11

Columna nullable para guardar la dirección postal legible obtenida por
geocodificación inversa en el dispositivo móvil al momento de capturar
el GPS. Funciona sin conexión a internet en la mayoría de dispositivos.
"""

from alembic import op
import sqlalchemy as sa

revision = "2026_05_11_0002"
down_revision = "2026_05_12_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reportes_app",
        sa.Column("direccion", sa.String(400), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("reportes_app", "direccion")
