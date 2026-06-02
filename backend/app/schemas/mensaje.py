import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import AutorMensajeEnum


class MensajeCreate(BaseModel):
    contenido:        str   = Field(..., min_length=1, max_length=1000)
    destruir_al_leer: bool  = False


class MensajeResponse(BaseModel):
    id:               uuid.UUID
    denuncia_id:      uuid.UUID
    autor:            AutorMensajeEnum
    contenido:        str
    destruir_al_leer: bool
    leido:            bool
    created_at:       datetime

    model_config = ConfigDict(from_attributes=True)
