# DEPRECADO — Este módulo ya no se usa en el código principal.
#
# El sistema de almacenamiento de fotos fue migrado a un servicio desacoplado
# en app/services/storage/ que soporta múltiples backends (local, MinIO, etc.)
# configurables por variable de entorno (STORAGE_BACKEND).
#
# Si necesitas reactivar Cloudinary en el futuro, crea una clase
# CloudinaryStorageBackend que implemente app.services.storage.base.StorageBackend
# y agrega 'cloudinary' como opción en app/services/storage/__init__.py.
