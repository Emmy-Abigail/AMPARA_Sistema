import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.circulo_confianza import CirculoConfianza
from app.models.usuario import Usuario
from app.schemas.responses import ApiResponse
from app.schemas.sos import CirculoContactoCreate, CirculoContactoResponse

router = APIRouter(tags=["Círculo de confianza"])

_MAX_CONTACTOS = 4


@router.get("/", response_model=ApiResponse[list[CirculoContactoResponse]])
async def listar_circulo(
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(CirculoConfianza)
        .where(CirculoConfianza.usuario_id == usuario.id)
        .order_by(CirculoConfianza.created_at.asc())
    )
    contactos = result.scalars().all()
    return ApiResponse(data=[CirculoContactoResponse.model_validate(c) for c in contactos])


@router.post("/", response_model=ApiResponse[CirculoContactoResponse], status_code=status.HTTP_201_CREATED)
async def agregar_contacto(
    data: CirculoContactoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    count_result = await db.execute(
        select(func.count()).where(CirculoConfianza.usuario_id == usuario.id)
    )
    if count_result.scalar_one() >= _MAX_CONTACTOS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El círculo de confianza no puede tener más de {_MAX_CONTACTOS} contactos",
        )

    contacto = CirculoConfianza(
        usuario_id= usuario.id,
        nombre=     data.nombre,
        telefono=   data.telefono,
    )
    db.add(contacto)
    await db.flush()
    await db.refresh(contacto)
    return ApiResponse(data=CirculoContactoResponse.model_validate(contacto))


@router.delete("/{contacto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_contacto(
    contacto_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(CirculoConfianza).where(
            CirculoConfianza.id == contacto_id,
            CirculoConfianza.usuario_id == usuario.id,
        )
    )
    contacto = result.scalar_one_or_none()
    if not contacto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contacto no encontrado")

    await db.delete(contacto)
    await db.flush()
    return None
