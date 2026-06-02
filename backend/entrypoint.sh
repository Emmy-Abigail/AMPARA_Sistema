#!/bin/sh
set -e

echo "Aplicando migraciones de base de datos..."
alembic upgrade head

echo "Iniciando servidor..."
exec "$@"
