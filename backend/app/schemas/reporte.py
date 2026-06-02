import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.enums import (
    ConocimientoDengueEnum,
    EstadoReporteEnum,
    ObservaLarvasEnum,
    TipoLugarEnum,
    TipoObjetoEnum,
)


class ReporteBase(BaseModel):
    tipo_lugar: TipoLugarEnum
    tipo_objeto: TipoObjetoEnum
    observa_larvas: ObservaLarvasEnum
    conocimiento_dengue_cercano: ConocimientoDengueEnum | None = None
    comentarios: str | None = Field(None, max_length=1000)


class ReporteCreate(ReporteBase):
    latitud: float = Field(..., ge=-90, le=90)
    longitud: float = Field(..., ge=-180, le=180)
    foto_url: str | None = Field(None, max_length=500)

    # Campos de idempotencia para reportes offline.
    # device_id: UUID persistente del dispositivo móvil (generado en la primera instalación).
    # local_id:  UUID generado en la app en el momento de crear el reporte.
    # Si el backend recibe (device_id, local_id) que ya existe, devuelve el reporte
    # existente en lugar de crear un duplicado.
    device_id: str | None = Field(None, max_length=64)
    local_id: str | None = Field(None, max_length=64)
    direccion: str | None = Field(None, max_length=400)


class ReporteResponse(ReporteBase):
    id: uuid.UUID
    usuario_id: uuid.UUID | None  # None cuando la cuenta del ciudadano fue eliminada
    latitud: float
    longitud: float
    foto_url: str | None
    estado: EstadoReporteEnum
    fecha_reporte: datetime
    fecha_actualizacion: datetime
    device_id: str | None = None
    local_id: str | None = None

    model_config = {"from_attributes": True}


class ReporteUpdate(BaseModel):
    estado: EstadoReporteEnum | None = None


class AlertaZona(BaseModel):
    zona: str
    departamento: str
    provincia: str
    nivel: str          # 'Alto' | 'Medio' | 'Bajo'
    descripcion: str
    total_reportes: int
    es_mi_zona: bool


class AlertasZonaResponse(BaseModel):
    alertas: list[AlertaZona]
    tiene_zona: bool    # si el usuario tiene departamento/provincia en su perfil
