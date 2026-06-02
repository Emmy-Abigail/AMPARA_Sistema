from app.core.config import settings

from .base import StorageBackend
from .local_storage import LocalStorageBackend


def _crear_backend() -> StorageBackend:
    backend = settings.STORAGE_BACKEND.lower()
    if backend == "local":
        return LocalStorageBackend(
            upload_dir=settings.UPLOAD_DIR,
            media_base_url=settings.MEDIA_BASE_URL,
        )
    raise ValueError(
        f"STORAGE_BACKEND='{backend}' no está soportado. "
        "Valores válidos: 'local'."
    )


# Instancia única — se crea al importar el módulo.
storage: StorageBackend = _crear_backend()
