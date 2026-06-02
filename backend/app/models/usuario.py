import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    nombre:   Mapped[str]      = mapped_column(String(150))
    apellido: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email:    Mapped[str]      = mapped_column(String(255), unique=True, index=True)
    telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Preferencia de contacto para seguimiento de casos
    preferencia_contacto: Mapped[str | None] = mapped_column(String(20), nullable=True)
    horario_contacto:     Mapped[str | None] = mapped_column(String(100), nullable=True)

    rol:              Mapped[str]  = mapped_column(String(50), default="usuario", server_default="usuario")
    push_token:       Mapped[str | None] = mapped_column(String(200), nullable=True)
    hashed_password:  Mapped[str]  = mapped_column(String(255))
    es_activo:        Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    fecha_registro: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ultimo_acceso:  Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Denuncias presentadas con cuenta
    denuncias: Mapped[list["Denuncia"]] = relationship(  # noqa: F821
        "Denuncia", back_populates="usuario",
        foreign_keys="Denuncia.usuario_id",
        lazy="select",
    )
    # Casos asignados como operador
    casos_asignados: Mapped[list["Denuncia"]] = relationship(  # noqa: F821
        "Denuncia", back_populates="operador",
        foreign_keys="Denuncia.operador_id",
        lazy="select",
    )
