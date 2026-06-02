import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CasoNoti(Base):
    __tablename__ = "casos_noti"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    id_caso_noti: Mapped[str] = mapped_column(String(100), unique=True, index=True)

    # Ubicación administrativa
    departamento: Mapped[str] = mapped_column(String(100))
    provincia: Mapped[str] = mapped_column(String(100))
    distrito: Mapped[str] = mapped_column(String(100))
    ubigeo: Mapped[str] = mapped_column(String(10))

    # Datos epidemiológicos
    enfermedad: Mapped[str] = mapped_column(String(150))
    ano_epidemiologico: Mapped[int] = mapped_column(Integer)
    semana_epidemiologica: Mapped[int] = mapped_column(Integer)
    tipo_diagnostico: Mapped[str] = mapped_column(String(50))
    diresa_notifica: Mapped[str] = mapped_column(String(150))

    # Datos del paciente
    edad: Mapped[int] = mapped_column(Integer)
    sexo: Mapped[str] = mapped_column(String(1))

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
