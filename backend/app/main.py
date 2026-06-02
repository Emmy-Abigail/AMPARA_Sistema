import logging
import os
import time

import redis.exceptions
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.api.v1 import api_router
from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter

# ─── Logging ──────────────────────────────────────────────────────────────────
# Configura el logging antes de crear la app para capturar eventos del startup.
# Formato legible en VPS (stdout → systemd journal o docker logs).
# Para integrar con Loki/ELK en el futuro: cambiar el handler sin tocar esto.

_log_level = logging.DEBUG if settings.DEBUG else logging.INFO
logging.basicConfig(
    level=_log_level,
    format="%(asctime)s %(levelname)-8s %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
# Silenciar librerías ruidosas en modo producción
if not settings.DEBUG:
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

logger = logging.getLogger("sivapre")

# ─── Aplicación ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="SIVAPRE API",
    version="1.0.0",
    description=(
        "API del Sistema de Vigilancia y Prevención de Enfermedades (SIVAPRE). "
        "Gestiona reportes epidemiológicos, usuarios, casos y visualización geoespacial."
    ),
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# ─── Rate limiting ────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(redis.exceptions.ConnectionError)
async def redis_connection_error_handler(request: Request, exc: redis.exceptions.ConnectionError):
    # Redis caído en runtime → el rate limiter no puede verificar el contador.
    # Fail-open: dejamos pasar la petición y logueamos la degradación.
    # Es mejor servir sin rate limiting brevemente que devolver 500 a los usuarios
    # mientras Docker reinicia el contenedor de Redis (suele tardar segundos).
    logger.error("Redis no disponible — rate limiting desactivado temporalmente: %s", exc)
    # No podemos reanudar el request desde aquí; devolvemos 503 claro en su lugar.
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "Servicio temporalmente no disponible. Intenta en unos segundos."},
    )

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ─── Middleware de logging de requests ────────────────────────────────────────
# Registra método, ruta, status y duración de cada request. Esencial para
# diagnosticar problemas en producción sin acceso a herramientas externas.

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.monotonic()
    try:
        response = await call_next(request)
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.info(
            "%s %s → %d  (%.0f ms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response
    except Exception as exc:
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.error(
            "%s %s → 500  (%.0f ms) | %s: %s",
            request.method,
            request.url.path,
            elapsed_ms,
            type(exc).__name__,
            exc,
        )
        raise

# ─── Archivos estáticos (fotos de reportes) ───────────────────────────────────
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ─── Manejo de errores de validación ─────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    errores: dict[str, list[str]] = {}
    for error in exc.errors():
        campo = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        errores.setdefault(campo, []).append(error["msg"])

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "mensaje": "Los datos enviados no son válidos.",
            "errores": errores,
        },
    )


# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(api_router)


# ─── Rutas base ───────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Bienvenido a SIVAPRE API",
        "version": app.version,
        "environment": settings.APP_ENV,
        "docs": "/docs" if settings.DEBUG else None,
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Verifica que el servidor y la base de datos están operativos.

    Usado por balanceadores de carga, Docker health checks y sistemas de monitoreo
    (UptimeRobot, etc.). Retorna 503 si la BD no responde.
    """
    # Verificar conectividad con la BD con un ping real.
    # Si la BD está caída, esto lanza excepción → 503 para el load balancer.
    try:
        async for db in get_db():
            await db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok", "version": app.version}
    except Exception as exc:
        logger.error("Health check DB ping failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "degraded",
                "db": "unreachable",
                "detail": str(exc),
            },
        )
