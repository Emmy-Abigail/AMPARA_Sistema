import asyncio
import io
import uuid
from datetime import date
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from .base import StorageBackend

_MAX_DIM = 1200
_WEBP_QUALITY = 75

# Límite de píxeles totales antes de decodificar la imagen completa.
# Protege contra "pixel bombs": archivos pequeños que se expanden a cientos
# de MB en RAM al abrirlos (p.ej. una PNG 1x1 con cabecera falsa de 100MP).
# 40 MP ≈ foto de cámara profesional de alta gama. Suficiente para evidencia.
Image.MAX_IMAGE_PIXELS = 40_000_000


class LocalStorageBackend(StorageBackend):
    """Almacena fotos en disco local organizadas por fecha.

    Estructura: <upload_dir>/YYYY/MM/DD/<uuid>.webp
    URL pública: <media_base_url>/uploads/YYYY/MM/DD/<uuid>.webp

    Para migrar a MinIO o S3: crear la clase correspondiente que implemente
    StorageBackend y cambiar STORAGE_BACKEND en .env. El resto del código no cambia.
    """

    def __init__(self, upload_dir: str, media_base_url: str) -> None:
        self._base = Path(upload_dir)
        self._media_base_url = media_base_url.rstrip("/")

    async def guardar(self, contenido: bytes, content_type: str) -> str:
        # Compresión con Pillow se ejecuta en thread pool para no bloquear el
        # event loop de asyncio. Una imagen de 10 MB puede tardar 200-500 ms
        # en comprimir. Con asyncio.to_thread corre en background sin bloquear
        # otras requests concurrentes.
        return await asyncio.to_thread(self._guardar_sync, contenido)

    def _guardar_sync(self, contenido: bytes) -> str:
        # ── Validación antes de decodificar ───────────────────────────────────
        try:
            # Image.open() es lazy: lee la cabecera pero NO decodifica píxeles.
            # Pillow lanza DecompressionBombError automáticamente si el tamaño
            # declarado en la cabecera supera MAX_IMAGE_PIXELS.
            img = Image.open(io.BytesIO(contenido))

            # Forzar la decodificación completa para detectar archivos corruptos
            # o truncados antes de intentar guardar.
            img.load()
        except Image.DecompressionBombError:
            raise ValueError(
                "La imagen es demasiado grande (supera 40 megapíxeles). "
                "Usa una foto de menor resolución."
            )
        except UnidentifiedImageError:
            raise ValueError("El archivo no es una imagen válida.")
        except Exception as exc:
            raise ValueError(f"No se pudo abrir la imagen: {exc}") from exc

        # ── Conversión de modo ────────────────────────────────────────────────
        # WebP soporta transparencia, pero convertir explícitamente evita
        # comportamientos inesperados en modos poco comunes (P, LA).
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")

        # ── Redimensión ───────────────────────────────────────────────────────
        img.thumbnail((_MAX_DIM, _MAX_DIM), Image.LANCZOS)

        # ── Guardar en disco ──────────────────────────────────────────────────
        hoy = date.today()
        subdir = self._base / str(hoy.year) / f"{hoy.month:02d}" / f"{hoy.day:02d}"
        subdir.mkdir(parents=True, exist_ok=True)

        file_id = uuid.uuid4().hex
        filepath = subdir / f"{file_id}.webp"

        try:
            img.save(filepath, "WEBP", quality=_WEBP_QUALITY, method=4)
        except OSError as exc:
            # Disco lleno u otro error de I/O — mensaje claro en lugar de 500 genérico.
            if "No space left" in str(exc) or exc.errno == 28:
                raise OSError(
                    "El servidor no tiene espacio en disco suficiente para guardar la imagen. "
                    "Contacta al administrador del sistema."
                ) from exc
            raise OSError(f"Error al escribir la imagen en disco: {exc}") from exc

        rel = filepath.relative_to(self._base)
        return f"{self._media_base_url}/uploads/{rel}"

    async def eliminar(self, url: str) -> None:
        prefix = f"{self._media_base_url}/uploads/"
        if not url.startswith(prefix):
            return
        rel = url[len(prefix):]
        path = self._base / rel
        await asyncio.to_thread(path.unlink, missing_ok=True)
