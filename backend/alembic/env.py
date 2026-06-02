import sys
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Permite importar módulos de la app desde dentro del contenedor (/app)
# y también al correr alembic directamente desde backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import settings
from app.core.database import Base

# Importar todos los modelos para que Alembic los detecte en Base.metadata
from app.models import Usuario, Reporte, CasoNoti, CasoNetlab  # noqa: F401

# Configuración de logging de alembic.ini
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Alembic no soporta asyncpg — usar psycopg2 solo para migraciones
SYNC_DATABASE_URL = settings.DATABASE_URL.replace(
    "postgresql+asyncpg", "postgresql+psycopg2"
)
# configparser usa % como interpolación — escapar para evitar ValueError con contraseñas que contengan %
config.set_main_option("sqlalchemy.url", SYNC_DATABASE_URL.replace("%", "%%"))

target_metadata = Base.metadata

# Tablas que pertenecen a la app — solo estas serán gestionadas por Alembic
APP_TABLES = {table.name for table in Base.metadata.sorted_tables}


def include_object(object, name, type_, reflected, compare_to):
    """Excluye tablas que no pertenecen a la app (PostGIS, Tiger, Topology, etc.)."""
    if type_ == "table":
        return name in APP_TABLES
    return True


def run_migrations_offline() -> None:
    """Genera SQL sin conectarse a la BD (útil para revisar antes de aplicar)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Aplica migraciones conectándose directamente a la BD."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
