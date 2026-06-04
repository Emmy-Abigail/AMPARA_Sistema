#!/bin/sh
set -e

echo "Esperando que la base de datos esté disponible..."
until python3 -c "
import psycopg2, os, sys
url = os.environ.get('DATABASE_URL', '')
sync_url = url.replace('postgresql+asyncpg', 'postgresql').replace('postgresql+psycopg2', 'postgresql')
try:
    psycopg2.connect(sync_url)
    print('BD lista.')
    sys.exit(0)
except Exception as e:
    print(f'BD no disponible: {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null; do
  printf '.'
  sleep 2
done
echo ""

echo "Aplicando migraciones de base de datos..."
alembic upgrade head

echo "Iniciando servidor..."
exec "$@"
