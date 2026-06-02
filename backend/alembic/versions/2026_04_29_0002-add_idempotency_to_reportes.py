"""add idempotency fields to reportes_app

Revision ID: 2026_04_29_0002
Revises: 2026_04_29_0001
Create Date: 2026-04-29

Agrega device_id y local_id al modelo Reporte para soportar idempotencia
en el flujo offline-first de la app móvil.

La combinación (device_id, local_id) identifica unívocamente un reporte
generado en un dispositivo. El índice único parcial excluye filas con NULL
para mantener compatibilidad con reportes anteriores que no tienen estos campos.
"""
from alembic import op
import sqlalchemy as sa


revision = '2026_04_29_0002'
down_revision = '2026_04_29_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('reportes_app', sa.Column('device_id', sa.String(64), nullable=True))
    op.add_column('reportes_app', sa.Column('local_id', sa.String(64), nullable=True))

    # Índice en device_id para búsquedas de idempotencia rápidas
    op.create_index('ix_reportes_device_id', 'reportes_app', ['device_id'])

    # Índice único parcial: solo aplica cuando ambos campos están presentes.
    # Permite múltiples filas con NULL (reportes sin device_id) sin violar unicidad.
    op.create_index(
        'uq_reportes_device_local',
        'reportes_app',
        ['device_id', 'local_id'],
        unique=True,
        postgresql_where=sa.text('device_id IS NOT NULL AND local_id IS NOT NULL'),
    )


def downgrade() -> None:
    op.drop_index('uq_reportes_device_local', table_name='reportes_app')
    op.drop_index('ix_reportes_device_id', table_name='reportes_app')
    op.drop_column('reportes_app', 'local_id')
    op.drop_column('reportes_app', 'device_id')
