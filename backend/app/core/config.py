from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ─── Entorno ──────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    DEBUG: bool = True

    # ─── PostgreSQL ───────────────────────────────────────────────────────────
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str

    # ─── Redis ────────────────────────────────────────────────────────────────
    # Usado por el rate limiter. Con múltiples workers o instancias del backend,
    # todos comparten el mismo contador — sin Redis, cada proceso tiene el suyo
    # y el límite efectivo se multiplica por el número de workers.
    REDIS_URL: str = "redis://redis:6379"

    # ─── JWT ──────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ─── Storage de fotos ─────────────────────────────────────────────────────
    # STORAGE_BACKEND: 'local' hoy. Para migrar a S3/MinIO: implementar
    # S3StorageBackend (ya existe la interfaz en storage/base.py) y cambiar
    # esta variable. Nada más cambia en el resto del código.
    STORAGE_BACKEND: str = "local"
    UPLOAD_DIR: str = "uploads"

    # URL base pública del servidor — se usa para construir las URLs de las fotos
    # guardadas en la BD. Debe ser la IP o dominio al que los clientes acceden.
    # En desarrollo: http://localhost:8000
    # En VPS:        http://IP_DEL_VPS:8000   (o https://api.tudominio.com)
    MEDIA_BASE_URL: str = "http://localhost:8000"

    # ─── Seguridad ────────────────────────────────────────────────────────────
    # Clave para el endpoint /auth/setup (creación del primer admin).
    # Generar con: openssl rand -hex 32
    ADMIN_SECRET_KEY: str = "cambiar-en-produccion"

    # ─── CORS ─────────────────────────────────────────────────────────────────
    # Lista de orígenes permitidos para el dashboard web.
    # La app móvil no usa CORS (cliente nativo), solo el navegador del dashboard.
    # En producción: ["http://IP_VPS:3000"] o ["https://dashboard.tudominio.com"]
    ALLOWED_ORIGINS: list[str] = []

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # variables no declaradas en el .env se ignoran silenciosamente
    )

    @model_validator(mode="after")
    def _enforce_production_requirements(self) -> "Settings":
        """Falla al arrancar si la configuración de producción es insegura.

        Es mejor fallar en el startup que descubrir el problema después de
        un deploy cuando ya hay usuarios usando el sistema.
        """
        if self.APP_ENV != "production":
            return self

        errors: list[str] = []

        if self.DEBUG:
            errors.append("DEBUG debe ser False")

        if any(host in self.MEDIA_BASE_URL for host in ("localhost", "127.0.0.1")):
            errors.append("MEDIA_BASE_URL no puede apuntar a localhost")

        if self.ALLOWED_ORIGINS == ["*"]:
            errors.append("ALLOWED_ORIGINS=['*'] expone el dashboard a cualquier origen")

        if self.ADMIN_SECRET_KEY == "cambiar-en-produccion":
            errors.append("ADMIN_SECRET_KEY tiene el valor por defecto inseguro")

        if len(self.JWT_SECRET_KEY) < 32:
            errors.append("JWT_SECRET_KEY debe tener al menos 32 caracteres")

        if errors:
            msg = "Configuración de producción inválida — el servidor no puede arrancar:\n"
            msg += "\n".join(f"  · {e}" for e in errors)
            raise ValueError(msg)

        return self


settings = Settings()
