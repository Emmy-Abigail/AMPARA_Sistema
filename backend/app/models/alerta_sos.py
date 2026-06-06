import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AlertaSos(Base):
    __tablename__ = "alertas_sos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    denuncia_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("denuncias.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    device_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    latitud:   Mapped[float | None] = mapped_column(Float, nullable=True)
    longitud:  Mapped[float | None] = mapped_column(Float, nullable=True)

    # activa | resuelta | cancelada
    estado: Mapped[str] = mapped_column(String(20), default="activa", server_default="activa", index=True)

    # Cuántos contactos del círculo recibieron SMS
    sms_enviados: Mapped[int] = mapped_column(default=0, server_default="0")

    fecha_activacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    fecha_resolucion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    usuario:   Mapped["Usuario | None"]  = relationship("Usuario",  foreign_keys=[usuario_id],  lazy="select")   # noqa: F821
    denuncia:  Mapped["Denuncia | None"] = relationship("Denuncia", foreign_keys=[denuncia_id], lazy="select")   # noqa: F821
