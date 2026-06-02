import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(150))
    apellido: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)
    departamento: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provincia: Mapped[str | None] = mapped_column(String(100), nullable=True)
    distrito: Mapped[str | None] = mapped_column(String(100), nullable=True)
    rol: Mapped[str] = mapped_column(String(50), default='ciudadano', server_default='ciudadano')
    push_token: Mapped[str | None] = mapped_column(String(200), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    es_activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ultimo_acceso: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relación inversa
    reportes: Mapped[list["Reporte"]] = relationship(
        "Reporte", back_populates="usuario", lazy="select"
    )
