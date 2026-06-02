import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditLog(Base):
    """Registro inmutable de cambios de estado en reportes.

    Queda en la BD permanentemente — nunca se borra. Requerido para sistemas
    gubernamentales de salud: trazabilidad de quién tomó qué acción y cuándo.
    """

    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    reporte_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reportes_app.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # El inspector/admin que hizo el cambio. SET NULL si su cuenta se elimina.
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False)
    # Guardado al momento del cambio — no se pierde si el usuario es eliminado.
    actor_nombre: Mapped[str | None] = mapped_column(String(200), nullable=True)
    estado_anterior: Mapped[str] = mapped_column(String(50), nullable=False)
    estado_nuevo: Mapped[str] = mapped_column(String(50), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
