import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.schemas.enums import PreferenciaContactoEnum, RolEnum


class UsuarioBase(BaseModel):
    nombre:   str      = Field(..., max_length=150)
    apellido: str | None = Field(None, max_length=100)
    email:    EmailStr
    telefono: str | None = Field(None, max_length=20)


class UsuarioCreate(UsuarioBase):
    password: str = Field(..., min_length=8)


class UsuarioUpdate(BaseModel):
    nombre:               str | None = Field(None, max_length=150)
    apellido:             str | None = Field(None, max_length=100)
    telefono:             str | None = Field(None, max_length=20)
    preferencia_contacto: PreferenciaContactoEnum | None = None
    horario_contacto:     str | None = Field(None, max_length=100)


class UsuarioResponse(BaseModel):
    id:                   uuid.UUID
    nombre:               str
    apellido:             str | None = None
    email:                str
    telefono:             str | None = None
    preferencia_contacto: PreferenciaContactoEnum | None = None
    horario_contacto:     str | None = None
    rol:                  RolEnum
    creadoEn:             datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def _map_fields(cls, data):
        if hasattr(data, "fecha_registro"):
            return {
                "id":                   data.id,
                "nombre":               data.nombre,
                "apellido":             data.apellido,
                "email":                data.email,
                "telefono":             data.telefono,
                "preferencia_contacto": data.preferencia_contacto,
                "horario_contacto":     data.horario_contacto,
                "rol":                  data.rol,
                "creadoEn":             data.fecha_registro,
            }
        return data


class CambiarPasswordRequest(BaseModel):
    password_actual: str
    password_nuevo:  str = Field(..., min_length=8)


class AuthResponse(BaseModel):
    token:        str
    refreshToken: str
    usuario:      UsuarioResponse
