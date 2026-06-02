import uuid
from datetime import datetime

from pydantic import BaseModel


class CasoNotiBase(BaseModel):
    id_caso_noti: str
    departamento: str
    provincia: str
    distrito: str
    ubigeo: str
    enfermedad: str
    ano_epidemiologico: int
    semana_epidemiologica: int
    tipo_diagnostico: str
    diresa_notifica: str
    edad: int
    sexo: str


class CasoNotiResponse(CasoNotiBase):
    id: uuid.UUID
    fecha_creacion: datetime

    model_config = {"from_attributes": True}
