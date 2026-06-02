import uuid
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Reporte(Base):
    __tablename__ = "reportes_app"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # nullable=True + SET NULL: si el ciudadano elimina su cuenta, el reporte
    # queda huérfano (usuario_id=NULL) pero el evento epidemiológico NO se pierde.
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # ─── Idempotencia (reportes offline) ─────────────────────────────────────
    # La app genera device_id una sola vez (AsyncStorage) y local_id por reporte.
    # El backend usa (device_id, local_id) para detectar duplicados y devolver
    # el reporte existente sin error cuando la app reintenta el envío.
    # Ambos son nullable para mantener compatibilidad con reportes creados antes
    # de implementar offline-first. El índice único parcial en la BD excluye NULLs.
    device_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    local_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Coordenadas planas (para consultas rápidas sin PostGIS)
    latitud: Mapped[float] = mapped_column(Float)
    longitud: Mapped[float] = mapped_column(Float)

    # Columna geoespacial PostGIS — SRID 4326 (WGS 84)
    ubicacion: Mapped[str | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=True
    )

    foto_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tipo_lugar: Mapped[str] = mapped_column(String(100))
    tipo_objeto: Mapped[str] = mapped_column(String(100))
    observa_larvas: Mapped[str] = mapped_column(String(50))
    conocimiento_dengue_cercano: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    comentarios: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Dirección postal legible obtenida por geocodificación inversa en el
    # dispositivo al momento de capturar el GPS (funciona sin internet en la
    # mayoría de dispositivos). Null en reportes anteriores a esta funcionalidad.
    direccion: Mapped[str | None] = mapped_column(String(400), nullable=True)
    estado: Mapped[str] = mapped_column(String(50), default="enviado")
    fecha_reporte: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relación con Usuario — sin cascade ORM (el control de borrado está en la BD).
    usuario: Mapped["Usuario | None"] = relationship(
        "Usuario", back_populates="reportes", lazy="select"
    )
