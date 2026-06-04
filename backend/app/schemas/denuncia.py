import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import (
    EstadoCasoEnum,
    NivelRiesgoEnum,
    PreferenciaContactoEnum,
    RelacionAgresorEnum,
    TipoViolenciaEnum,
)


class DenunciaCreate(BaseModel):
    tipo_violencia:       TipoViolenciaEnum
    relacion_agresor:     RelacionAgresorEnum
    hay_heridos:          bool
    foto_url:             str | None = None
    audio_url:            str | None = None
    latitud:              float | None = Field(None, ge=-90.0,  le=90.0)
    longitud:             float | None = Field(None, ge=-180.0, le=180.0)
    preferencia_contacto: PreferenciaContactoEnum = PreferenciaContactoEnum.NINGUNO
    horario_contacto:     str | None = Field(None, max_length=100)
    device_id:            str | None = Field(None, max_length=64)
    local_id:             str | None = Field(None, max_length=64)
    # token_anonimo viene del cliente (generado en el dispositivo)
    token_anonimo:        str | None = Field(None, max_length=20)


class DenunciaResponse(BaseModel):
    id:                   uuid.UUID
    token_anonimo:        str
    tipo_violencia:       TipoViolenciaEnum
    relacion_agresor:     RelacionAgresorEnum
    nivel_riesgo:         NivelRiesgoEnum
    hay_heridos:          bool
    foto_url:             str | None = None
    audio_url:            str | None = None
    latitud:              float | None = None
    longitud:             float | None = None
    preferencia_contacto: PreferenciaContactoEnum
    horario_contacto:     str | None = None
    es_anonima:           bool
    estado:               EstadoCasoEnum
    fecha_denuncia:       datetime
    fecha_actualizacion:  datetime

    model_config = ConfigDict(from_attributes=True)


class DenunciaEstadoUpdate(BaseModel):
    estado:        EstadoCasoEnum
    motivo_cierre: str | None = Field(None, max_length=500)


class DenunciaAsignarUpdate(BaseModel):
    operador_id: uuid.UUID


# Vista resumida para listas (menos campos para ahorrar ancho de banda)
class DenunciaResumen(BaseModel):
    id:              uuid.UUID
    token_anonimo:   str
    tipo_violencia:  TipoViolenciaEnum
    nivel_riesgo:    NivelRiesgoEnum
    hay_heridos:     bool
    es_anonima:      bool
    estado:          EstadoCasoEnum
    fecha_denuncia:  datetime
    fecha_actualizacion: datetime

    model_config = ConfigDict(from_attributes=True)
