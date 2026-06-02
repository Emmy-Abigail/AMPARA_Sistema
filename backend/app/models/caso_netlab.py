import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CasoNetlab(Base):
    __tablename__ = "casos_netlab"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    id_muestra_netlab: Mapped[str] = mapped_column(String(100), unique=True, index=True)

    fecha_corte: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Ubicación del paciente
    departamento_paciente: Mapped[str] = mapped_column(String(100))
    provincia_paciente: Mapped[str] = mapped_column(String(100))
    distrito_paciente: Mapped[str] = mapped_column(String(100))
    ubigeo_paciente: Mapped[str] = mapped_column(String(10))

    # Datos del paciente
    edad_paciente: Mapped[int] = mapped_column(Integer)
    sexo_paciente: Mapped[str] = mapped_column(String(1))

    # Resultados de laboratorio
    nombre_examen: Mapped[str] = mapped_column(String(200))
    dx_molecular_dengue: Mapped[str | None] = mapped_column(String(50), nullable=True)
    serotipo_dengue: Mapped[str | None] = mapped_column(String(20), nullable=True)
    elisa_ns1: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fecha_validado: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
