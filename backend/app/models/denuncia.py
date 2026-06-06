import json
import uuid
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def calcular_nivel_riesgo(relacion: str, hay_heridos: bool, factores: list[str]) -> str:
    if hay_heridos or "amenazas_muerte" in factores or "acceso_armas" in factores:
        return "urgente"
    if relacion in ("Pareja o expareja", "Cónyuge", "Expareja") or "convive" in factores or "violencia_escalando" in factores:
        return "alto"
    if "seguimiento_vigilancia" in factores or "orden_alejamiento_violada" in factores:
        return "medio"
    return "bajo"


class Denuncia(Base):
    __tablename__ = "denuncias"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Nullable: denuncias anónimas no tienen usuario
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Token de seguimiento anónimo — generado en el cliente, único en BD
    token_anonimo: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    # Código corto amigable para usuarias anónimas (6 chars, sin 0/O/1/I)
    codigo_acceso: Mapped[str | None] = mapped_column(String(6), unique=True, index=True, nullable=True)

    # Idempotencia para el sync offline
    device_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    local_id:  Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Dominio
    tipo_violencia:   Mapped[str]       = mapped_column(String(50))           # v1 compat
    tipos_violencia:  Mapped[str | None] = mapped_column(Text, nullable=True) # v2 JSON array
    relacion_agresor: Mapped[str]       = mapped_column(String(50))
    factores_riesgo:  Mapped[str | None] = mapped_column(Text, nullable=True) # v2 JSON array
    nivel_riesgo:     Mapped[str]       = mapped_column(String(20), index=True)
    hay_heridos:      Mapped[bool]      = mapped_column(Boolean, default=False)
    descripcion:      Mapped[str | None] = mapped_column(Text, nullable=True)

    # Evidencia
    foto_url:  Mapped[str | None] = mapped_column(String(500), nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Geolocalización
    latitud:  Mapped[float | None] = mapped_column(Float, nullable=True)
    longitud: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Columna PostGIS — SRID 4326 (WGS 84)
    ubicacion: Mapped[str | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=True
    )

    # Contacto
    preferencia_contacto: Mapped[str]      = mapped_column(String(20), default="ninguno")
    horario_contacto:     Mapped[str | None] = mapped_column(String(100), nullable=True)

    es_anonima: Mapped[bool] = mapped_column(Boolean, default=True)
    estado:     Mapped[str]  = mapped_column(String(50), default="nueva", server_default="nueva", index=True)

    # Operador asignado
    operador_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    motivo_cierre: Mapped[str | None] = mapped_column(String(500), nullable=True)

    fecha_denuncia:     Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relaciones
    usuario:  Mapped["Usuario | None"] = relationship(  # noqa: F821
        "Usuario", back_populates="denuncias", foreign_keys=[usuario_id], lazy="select"
    )
    operador: Mapped["Usuario | None"] = relationship(  # noqa: F821
        "Usuario", back_populates="casos_asignados", foreign_keys=[operador_id], lazy="select"
    )
    mensajes: Mapped[list["MensajeCaso"]] = relationship(  # noqa: F821
        "MensajeCaso", back_populates="denuncia",
        cascade="all, delete-orphan", lazy="select", order_by="MensajeCaso.created_at"
    )
