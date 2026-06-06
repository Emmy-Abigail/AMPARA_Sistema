import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import get_current_user, get_optional_user
from app.models.alerta_sos import AlertaSos
from app.models.circulo_confianza import CirculoConfianza
from app.models.usuario import Usuario
from app.schemas.responses import ApiResponse
from app.schemas.sos import SosActivar, SosResponse
from app.services.sms import _texto_sos, enviar_sms

router = APIRouter(tags=["SOS"])


@router.post("/", response_model=ApiResponse[SosResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def activar_sos(
    request: Request,
    data: SosActivar,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario | None = Depends(get_optional_user),
):
    alerta = AlertaSos(
        usuario_id=  usuario.id if usuario else None,
        denuncia_id= data.denuncia_id,
        device_id=   data.device_id,
        latitud=     data.latitud,
        longitud=    data.longitud,
        estado=      "activa",
    )
    db.add(alerta)
    await db.flush()

    # Notificar círculo de confianza por SMS
    enviados = 0
    if usuario:
        result = await db.execute(
            select(CirculoConfianza).where(CirculoConfianza.usuario_id == usuario.id)
        )
        contactos = result.scalars().all()
        nombre = usuario.nombre if usuario else None
        texto  = _texto_sos(nombre, data.latitud, data.longitud)
        for contacto in contactos:
            ok = await enviar_sms(contacto.telefono, texto)
            if ok:
                enviados += 1

    alerta.sms_enviados = enviados
    await db.flush()
    await db.refresh(alerta)

    return ApiResponse(
        data=SosResponse.model_validate(alerta),
        mensaje="Alerta SOS activada",
    )


@router.get("/mis-alertas", response_model=ApiResponse[list[SosResponse]])
async def mis_alertas_sos(
    authorization: Optional[str] = Header(default=None),
    x_device_id:   Optional[str] = Header(default=None, alias="X-Device-Id"),
    db: AsyncSession = Depends(get_db),
):
    usuario = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            if payload.get("type") == "access":
                email = payload.get("sub")
                if email:
                    result = await db.execute(select(Usuario).where(Usuario.email == email))
                    usuario = result.scalar_one_or_none()
        except (JWTError, Exception):
            pass

    if usuario:
        q = select(AlertaSos).where(AlertaSos.usuario_id == usuario.id)
    elif x_device_id:
        q = select(AlertaSos).where(AlertaSos.device_id == x_device_id)
    else:
        return ApiResponse(data=[])

    result = await db.execute(q.order_by(AlertaSos.fecha_activacion.desc()).limit(10))
    alertas = result.scalars().all()
    return ApiResponse(data=[SosResponse.model_validate(a) for a in alertas])


@router.patch("/{alerta_id}/resolver", status_code=status.HTTP_204_NO_CONTENT)
async def resolver_sos(
    alerta_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(AlertaSos).where(AlertaSos.id == alerta_id))
    alerta = result.scalar_one_or_none()
    if not alerta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta no encontrada")

    es_propia  = alerta.usuario_id == usuario.id
    es_staff   = usuario.rol in ("operador", "admin")
    if not es_propia and not es_staff:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    alerta.estado = "resuelta"
    await db.flush()
    return None
