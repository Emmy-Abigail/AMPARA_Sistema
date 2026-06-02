import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditLog(Base):
    """Registro inmutable de cambios de estado en denuncias.

    Nunca se borra — proporciona trazabilidad completa de qué operador
    tomó qué acción y cuándo sobre cada caso.
    """

    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    denuncia_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("denuncias.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    actor_email:      Mapped[str]      = mapped_column(String(255), nullable=False)
    actor_nombre:     Mapped[str | None] = mapped_column(String(200), nullable=True)
    estado_anterior:  Mapped[str]      = mapped_column(String(50), nullable=False)
    estado_nuevo:     Mapped[str]      = mapped_column(String(50), nullable=False)
    notas:            Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
