import os

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Redis como backend de almacenamiento garantiza que el contador de rate limiting
# es compartido entre todos los workers del proceso uvicorn. Sin Redis, cada worker
# tiene su propio contador y el límite efectivo se multiplica por el número de workers
# (p.ej. 4 workers × 30/min = 120 req/min reales, no 30).
# En entornos de test (TESTING=1) se desactiva para no interferir con las pruebas.
_testing = os.getenv("TESTING", "0") == "1"
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL,
    enabled=not _testing,
)
