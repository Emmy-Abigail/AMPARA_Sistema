"""initial_ampara_schema

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-06-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision = "a1b2c3d4e5f6"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extensión PostGIS (requerida para Geometry)
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # ── Tabla usuarios ────────────────────────────────────────────────────────
    op.create_table(
        "usuarios",
        sa.Column("id",                   postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("nombre",               sa.String(150),  nullable=False),
        sa.Column("apellido",             sa.String(100),  nullable=True),
        sa.Column("email",                sa.String(255),  nullable=False),
        sa.Column("telefono",             sa.String(20),   nullable=True),
        sa.Column("preferencia_contacto", sa.String(20),   nullable=True),
        sa.Column("horario_contacto",     sa.String(100),  nullable=True),
        sa.Column("rol",                  sa.String(50),   nullable=False, server_default="usuario"),
        sa.Column("push_token",           sa.String(200),  nullable=True),
        sa.Column("hashed_password",      sa.String(255),  nullable=False),
        sa.Column("es_activo",            sa.Boolean(),    nullable=False, server_default="true"),
        sa.Column("fecha_registro",       sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("ultimo_acceso",        sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_usuarios_email", "usuarios", ["email"], unique=True)

    # ── Tabla denuncias ───────────────────────────────────────────────────────
    op.create_table(
        "denuncias",
        sa.Column("id",                   postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("usuario_id",           postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("token_anonimo",        sa.String(20),   nullable=False),
        sa.Column("device_id",            sa.String(64),   nullable=True),
        sa.Column("local_id",             sa.String(64),   nullable=True),
        sa.Column("tipo_violencia",       sa.String(50),   nullable=False),
        sa.Column("relacion_agresor",     sa.String(50),   nullable=False),
        sa.Column("nivel_riesgo",         sa.String(20),   nullable=False),
        sa.Column("hay_heridos",          sa.Boolean(),    nullable=False, server_default="false"),
        sa.Column("foto_url",             sa.String(500),  nullable=True),
        sa.Column("audio_url",            sa.String(500),  nullable=True),
        sa.Column("latitud",              sa.Float(),      nullable=True),
        sa.Column("longitud",             sa.Float(),      nullable=True),
        sa.Column("ubicacion",            geoalchemy2.Geometry("POINT", srid=4326), nullable=True),
        sa.Column("preferencia_contacto", sa.String(20),   nullable=False, server_default="ninguno"),
        sa.Column("horario_contacto",     sa.String(100),  nullable=True),
        sa.Column("es_anonima",           sa.Boolean(),    nullable=False, server_default="true"),
        sa.Column("estado",               sa.String(50),   nullable=False, server_default="nueva"),
        sa.Column("operador_id",          postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("motivo_cierre",        sa.String(500),  nullable=True),
        sa.Column("fecha_denuncia",       sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("fecha_actualizacion",  sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_denuncias_token_anonimo", "denuncias", ["token_anonimo"], unique=True)
    op.create_index("ix_denuncias_usuario_id",    "denuncias", ["usuario_id"])
    op.create_index("ix_denuncias_device_id",     "denuncias", ["device_id"])
    op.create_index("ix_denuncias_nivel_riesgo",  "denuncias", ["nivel_riesgo"])
    op.create_index("ix_denuncias_estado",        "denuncias", ["estado"])
    op.create_index("ix_denuncias_fecha",         "denuncias", ["fecha_denuncia"])
    op.create_index("ix_denuncias_operador_id",   "denuncias", ["operador_id"])

    # Índice único parcial para idempotencia offline (excluye NULLs automáticamente)
    op.create_index(
        "uq_denuncias_device_local",
        "denuncias",
        ["device_id", "local_id"],
        unique=True,
        postgresql_where=sa.text("device_id IS NOT NULL AND local_id IS NOT NULL"),
    )

    # ── Tabla mensajes_caso ───────────────────────────────────────────────────
    op.create_table(
        "mensajes_caso",
        sa.Column("id",               postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("denuncia_id",      postgresql.UUID(as_uuid=True), sa.ForeignKey("denuncias.id", ondelete="CASCADE"), nullable=False),
        sa.Column("autor",            sa.String(20),   nullable=False),
        sa.Column("contenido",        sa.Text(),       nullable=False),
        sa.Column("destruir_al_leer", sa.Boolean(),    nullable=False, server_default="false"),
        sa.Column("leido",            sa.Boolean(),    nullable=False, server_default="false"),
        sa.Column("created_at",       sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_mensajes_denuncia_id", "mensajes_caso", ["denuncia_id"])
    op.create_index("ix_mensajes_leido",       "mensajes_caso", ["leido"])

    # Trigger para actualizar fecha_actualizacion en denuncias automáticamente
    op.execute("""
        CREATE OR REPLACE FUNCTION actualizar_fecha_actualizacion()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.fecha_actualizacion = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER trg_denuncias_updated
        BEFORE UPDATE ON denuncias
        FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_actualizacion();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_denuncias_updated ON denuncias")
    op.execute("DROP FUNCTION IF EXISTS actualizar_fecha_actualizacion")
    op.drop_table("mensajes_caso")
    op.drop_table("denuncias")
    op.drop_table("usuarios")
