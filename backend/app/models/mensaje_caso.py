import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MensajeCaso(Base):
    __tablename__ = "mensajes_caso"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    denuncia_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("denuncias.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    autor:            Mapped[str]  = mapped_column(String(20))  # operador | sistema
    contenido:        Mapped[str]  = mapped_column(Text)
    destruir_al_leer: Mapped[bool] = mapped_column(Boolean, default=False)
    leido:            Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    denuncia: Mapped["Denuncia"] = relationship(  # noqa: F821
        "Denuncia", back_populates="mensajes"
    )
