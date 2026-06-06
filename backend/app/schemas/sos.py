import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SosActivar(BaseModel):
    latitud:    float | None = Field(None, ge=-90.0,  le=90.0)
    longitud:   float | None = Field(None, ge=-180.0, le=180.0)
    denuncia_id: uuid.UUID | None = None
    device_id:  str | None = Field(None, max_length=64)


class SosResponse(BaseModel):
    id:               uuid.UUID
    estado:           str
    sms_enviados:     int
    denuncia_id:      uuid.UUID | None = None
    latitud:          float | None = None
    longitud:         float | None = None
    fecha_activacion: datetime
    fecha_resolucion: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class CirculoContactoCreate(BaseModel):
    nombre:   str = Field(..., min_length=1, max_length=100)
    telefono: str = Field(..., min_length=7, max_length=20)


class CirculoContactoResponse(BaseModel):
    id:         uuid.UUID
    nombre:     str
    telefono:   str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
