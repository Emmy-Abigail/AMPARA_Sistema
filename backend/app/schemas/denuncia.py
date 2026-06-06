import json
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.enums import (
    EstadoCasoEnum,
    FactorRiesgoEnum,
    NivelRiesgoEnum,
    PreferenciaContactoEnum,
    RelacionAgresorEnum,
    TipoViolenciaEnum,
)


def _calcular_nivel_riesgo_v2(
    relacion: str,
    hay_heridos: bool,
    factores: list[str],
) -> str:
    if hay_heridos or "amenazas_muerte" in factores or "acceso_armas" in factores:
        return NivelRiesgoEnum.URGENTE
    if relacion in ("Pareja o expareja", "Cónyuge", "Expareja") or "convive" in factores or "violencia_escalando" in factores:
        return NivelRiesgoEnum.ALTO
    if "seguimiento_vigilancia" in factores or "orden_alejamiento_violada" in factores:
        return NivelRiesgoEnum.MEDIO
    return NivelRiesgoEnum.BAJO


class DenunciaCreate(BaseModel):
    # v2: array de tipos (multi-select). Al menos uno requerido.
    tipos_violencia:      list[TipoViolenciaEnum] = Field(..., min_length=1)
    relacion_agresor:     RelacionAgresorEnum
    factores_riesgo:      list[FactorRiesgoEnum] = Field(default_factory=list)
    hay_heridos:          bool
    foto_url:             str | None = None
    audio_url:            str | None = None
    latitud:              float | None = Field(None, ge=-90.0,  le=90.0)
    longitud:             float | None = Field(None, ge=-180.0, le=180.0)
    preferencia_contacto: PreferenciaContactoEnum = PreferenciaContactoEnum.NINGUNO
    horario_contacto:     str | None = Field(None, max_length=100)
    descripcion:          str | None = Field(None, max_length=500)
    device_id:            str | None = Field(None, max_length=64)
    local_id:             str | None = Field(None, max_length=64)
    token_anonimo:        str | None = Field(None, max_length=20)
    codigo_acceso:        str | None = Field(None, max_length=6)  # cliente puede proponer uno

    # Acepta también el campo legado tipo_violencia (v1 sync engines)
    tipo_violencia: TipoViolenciaEnum | None = None

    @model_validator(mode="before")
    @classmethod
    def _backfill_tipos_from_tipo(cls, values: Any) -> Any:
        if isinstance(values, dict) and not values.get("tipos_violencia") and values.get("tipo_violencia"):
            values["tipos_violencia"] = [values["tipo_violencia"]]
        return values

    @field_validator("tipos_violencia", mode="before")
    @classmethod
    def coerce_single_to_list(cls, v: Any) -> Any:
        if isinstance(v, str):
            return [v]
        return v

    def nivel_riesgo_calculado(self) -> str:
        factores = [f.value if hasattr(f, "value") else f for f in self.factores_riesgo]
        return _calcular_nivel_riesgo_v2(
            self.relacion_agresor.value,
            self.hay_heridos,
            factores,
        )


class MensajeResponderCreate(BaseModel):
    contenido:     str = Field(..., min_length=1, max_length=500)
    token_anonimo: str | None = Field(None, max_length=20)


class DenunciaResponse(BaseModel):
    id:                   uuid.UUID
    token_anonimo:        str
    codigo_acceso:        str | None = None
    # v2 devuelve el array; tipo_violencia sigue presente para compat
    tipos_violencia:      list[str]
    tipo_violencia:       str
    relacion_agresor:     str
    factores_riesgo:      list[str]
    nivel_riesgo:         NivelRiesgoEnum
    hay_heridos:          bool
    foto_url:             str | None = None
    audio_url:            str | None = None
    latitud:              float | None = None
    longitud:             float | None = None
    preferencia_contacto: PreferenciaContactoEnum
    horario_contacto:     str | None = None
    descripcion:          str | None = None
    es_anonima:           bool
    estado:               EstadoCasoEnum
    motivo_cierre:        str | None = None
    fecha_denuncia:       datetime
    fecha_actualizacion:  datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_extended(cls, obj: Any) -> "DenunciaResponse":
        tipos = json.loads(obj.tipos_violencia) if obj.tipos_violencia else [obj.tipo_violencia]
        factores = json.loads(obj.factores_riesgo) if obj.factores_riesgo else []
        return cls(
            id=obj.id,
            token_anonimo=obj.token_anonimo,
            codigo_acceso=obj.codigo_acceso,
            tipos_violencia=tipos,
            tipo_violencia=tipos[0] if tipos else obj.tipo_violencia,
            relacion_agresor=obj.relacion_agresor,
            factores_riesgo=factores,
            nivel_riesgo=obj.nivel_riesgo,
            hay_heridos=obj.hay_heridos,
            foto_url=obj.foto_url,
            audio_url=obj.audio_url,
            latitud=obj.latitud,
            longitud=obj.longitud,
            preferencia_contacto=obj.preferencia_contacto,
            horario_contacto=obj.horario_contacto,
            descripcion=obj.descripcion,
            es_anonima=obj.es_anonima,
            estado=obj.estado,
            motivo_cierre=obj.motivo_cierre,
            fecha_denuncia=obj.fecha_denuncia,
            fecha_actualizacion=obj.fecha_actualizacion,
        )


class DenunciaEstadoUpdate(BaseModel):
    estado:        EstadoCasoEnum
    motivo_cierre: str | None = Field(None, max_length=500)


class DenunciaAsignarUpdate(BaseModel):
    operador_id: uuid.UUID


class DenunciaResumen(BaseModel):
    id:                  uuid.UUID
    token_anonimo:       str
    codigo_acceso:       str | None = None
    tipos_violencia:     list[str]
    tipo_violencia:      str
    nivel_riesgo:        NivelRiesgoEnum
    hay_heridos:         bool
    es_anonima:          bool
    estado:              EstadoCasoEnum
    fecha_denuncia:      datetime
    fecha_actualizacion: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_extended(cls, obj: Any) -> "DenunciaResumen":
        tipos = json.loads(obj.tipos_violencia) if obj.tipos_violencia else [obj.tipo_violencia]
        return cls(
            id=obj.id,
            token_anonimo=obj.token_anonimo,
            codigo_acceso=obj.codigo_acceso,
            tipos_violencia=tipos,
            tipo_violencia=tipos[0] if tipos else obj.tipo_violencia,
            nivel_riesgo=obj.nivel_riesgo,
            hay_heridos=obj.hay_heridos,
            es_anonima=obj.es_anonima,
            estado=obj.estado,
            fecha_denuncia=obj.fecha_denuncia,
            fecha_actualizacion=obj.fecha_actualizacion,
        )
