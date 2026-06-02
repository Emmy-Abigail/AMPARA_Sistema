from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    data: T
    exito: bool = True
    mensaje: str | None = None


class PaginatedData(BaseModel, Generic[T]):
    data: list[T]
    total: int
    pagina: int
    porPagina: int


class FotoResponse(BaseModel):
    url: str
