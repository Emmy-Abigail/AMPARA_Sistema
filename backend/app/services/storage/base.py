from abc import ABC, abstractmethod


class StorageBackend(ABC):
    """Interfaz abstracta para almacenamiento de archivos.

    Implementaciones concretas: LocalStorageBackend (disco local), MinioStorageBackend (futuro).
    El resto del código depende solo de esta interfaz — nunca de la implementación.
    """

    @abstractmethod
    async def guardar(self, contenido: bytes, content_type: str) -> str:
        """Guarda el archivo y retorna su URL pública completa."""

    @abstractmethod
    async def eliminar(self, url: str) -> None:
        """Elimina el archivo dado su URL pública. Silencioso si no existe."""
