import asyncio
import io
import uuid
from datetime import date
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from .base import StorageBackend

_MAX_DIM      = 1200
_WEBP_QUALITY = 75

# Protección contra "pixel bombs"
Image.MAX_IMAGE_PIXELS = 40_000_000


class LocalStorageBackend(StorageBackend):
    """Almacena archivos en disco local organizados por fecha.

    Estructura: <upload_dir>/YYYY/MM/DD/<uuid>.<ext>
    URL pública: <media_base_url>/uploads/YYYY/MM/DD/<uuid>.<ext>
    """

    def __init__(self, upload_dir: str, media_base_url: str) -> None:
        self._base = Path(upload_dir)
        self._media_base_url = media_base_url.rstrip("/")

    # ─── Imágenes ─────────────────────────────────────────────────────────────

    async def guardar(self, contenido: bytes, content_type: str) -> str:
        return await asyncio.to_thread(self._guardar_imagen_sync, contenido)

    def _guardar_imagen_sync(self, contenido: bytes) -> str:
        try:
            img = Image.open(io.BytesIO(contenido))
            img.load()
        except Image.DecompressionBombError:
            raise ValueError("La imagen supera 40 megapíxeles. Usa una foto de menor resolución.")
        except UnidentifiedImageError:
            raise ValueError("El archivo no es una imagen válida.")
        except Exception as exc:
            raise ValueError(f"No se pudo abrir la imagen: {exc}") from exc

        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")

        img.thumbnail((_MAX_DIM, _MAX_DIM), Image.LANCZOS)

        filepath = self._ruta_nueva(extension=".webp")
        try:
            img.save(filepath, "WEBP", quality=_WEBP_QUALITY, method=4)
        except OSError as exc:
            if "No space left" in str(exc) or getattr(exc, "errno", None) == 28:
                raise OSError("Sin espacio en disco. Contacta al administrador.") from exc
            raise OSError(f"Error al escribir la imagen: {exc}") from exc

        return self._url_publica(filepath)

    # ─── Audio / archivos binarios ────────────────────────────────────────────

    async def guardar_archivo(self, contenido: bytes, content_type: str, extension: str = ".bin") -> str:
        return await asyncio.to_thread(self._guardar_archivo_sync, contenido, extension)

    def _guardar_archivo_sync(self, contenido: bytes, extension: str) -> str:
        filepath = self._ruta_nueva(extension=extension)
        try:
            filepath.write_bytes(contenido)
        except OSError as exc:
            if "No space left" in str(exc) or getattr(exc, "errno", None) == 28:
                raise OSError("Sin espacio en disco. Contacta al administrador.") from exc
            raise OSError(f"Error al escribir el archivo: {exc}") from exc
        return self._url_publica(filepath)

    # ─── Eliminación ──────────────────────────────────────────────────────────

    async def eliminar(self, url: str) -> None:
        prefix = f"{self._media_base_url}/uploads/"
        if not url.startswith(prefix):
            return
        rel  = url[len(prefix):]
        path = self._base / rel
        await asyncio.to_thread(path.unlink, missing_ok=True)

    # ─── Helpers privados ─────────────────────────────────────────────────────

    def _ruta_nueva(self, extension: str) -> Path:
        hoy    = date.today()
        subdir = self._base / str(hoy.year) / f"{hoy.month:02d}" / f"{hoy.day:02d}"
        subdir.mkdir(parents=True, exist_ok=True)
        return subdir / f"{uuid.uuid4().hex}{extension}"

    def _url_publica(self, filepath: Path) -> str:
        rel = filepath.relative_to(self._base)
        return f"{self._media_base_url}/uploads/{rel}"
