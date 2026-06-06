import json
import secrets
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, UploadFile, File, status
from geoalchemy2.functions import ST_MakePoint, ST_SetSRID
from jose import jwt, JWTError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import get_current_user
from app.models.denuncia import Denuncia, calcular_nivel_riesgo
from app.models.mensaje_caso import MensajeCaso
from app.models.usuario import Usuario
from app.schemas.denuncia import (
    DenunciaCreate,
    DenunciaResumen,
    DenunciaResponse,
    MensajeResponderCreate,
)
from app.schemas.mensaje import MensajeResponse
from app.schemas.responses import ApiResponse, PaginatedData
from app.services.notifications import enviar_notificacion_respuesta_operador
from app.services.storage import storage

router = APIRouter(tags=["Denuncias"])

_TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _generar_token_anonimo() -> str:
    parte1 = "".join(secrets.choice(_TOKEN_CHARS) for _ in range(4))
    parte2 = "".join(secrets.choice(_TOKEN_CHARS) for _ in range(4))
    return f"AMP-{parte1}-{parte2}"


def _generar_codigo_acceso() -> str:
    return "".join(secrets.choice(_TOKEN_CHARS) for _ in range(6))


async def _resolve_optional_user(
    authorization: Optional[str],
    db: AsyncSession,
) -> Optional[Usuario]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        email: str | None = payload.get("sub")
        if not email:
            return None
        result = await db.execute(select(Usuario).where(Usuario.email == email))
        return result.scalar_one_or_none()
    except (JWTError, Exception):
        return None


# ─── Subida de foto ───────────────────────────────────────────────────────────

@router.post("/foto", response_model=ApiResponse[dict])
@limiter.limit("30/minute")
async def subir_foto(
    request: Request,
    foto: UploadFile = File(...),
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    if foto.content_type not in ("image/jpeg", "image/png", "image/webp", "image/heic"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Formato de imagen no soportado")

    contenido = await foto.read()
    if len(contenido) > 15 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="La imagen supera 15 MB")

    try:
        url = await storage.guardar(contenido, foto.content_type)
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    return ApiResponse(data={"url": url})


# ─── Subida de audio ──────────────────────────────────────────────────────────

@router.post("/audio", response_model=ApiResponse[dict])
@limiter.limit("20/minute")
async def subir_audio(
    request: Request,
    audio: UploadFile = File(...),
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    TIPOS_AUDIO = ("audio/mp4", "audio/mpeg", "audio/ogg", "audio/webm", "audio/wav", "audio/x-m4a")
    if audio.content_type not in TIPOS_AUDIO:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Formato de audio no soportado")

    contenido = await audio.read()
    if len(contenido) > 20 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="El audio supera 20 MB")

    try:
        url = await storage.guardar_archivo(contenido, audio.content_type, extension=".m4a")
    except OSError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    return ApiResponse(data={"url": url})


# ─── Crear denuncia ───────────────────────────────────────────────────────────

@router.post("/", response_model=ApiResponse[DenunciaResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def crear_denuncia(
    request: Request,
    data: DenunciaCreate,
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    # Idempotencia: mismo (device_id, local_id) devuelve la denuncia existente
    if data.device_id and data.local_id:
        result = await db.execute(
            select(Denuncia).where(
                Denuncia.device_id == data.device_id,
                Denuncia.local_id  == data.local_id,
            )
        )
        existente = result.scalar_one_or_none()
        if existente:
            return ApiResponse(data=DenunciaResponse.from_orm_extended(existente))

    usuario = await _resolve_optional_user(authorization, db)

    token_anonimo = data.token_anonimo
    if token_anonimo:
        result = await db.execute(select(Denuncia).where(Denuncia.token_anonimo == token_anonimo))
        if result.scalar_one_or_none():
            token_anonimo = None

    if not token_anonimo:
        token_anonimo = _generar_token_anonimo()

    tipos_lista  = [t.value for t in data.tipos_violencia]
    factores_lista = [f.value for f in data.factores_riesgo]
    nivel_riesgo = data.nivel_riesgo_calculado()

    # Cliente puede proponer su propio codigo_acceso (generado offline); lo usamos si no colisiona
    codigo_acceso_propuesto = data.codigo_acceso.upper() if data.codigo_acceso else None
    if codigo_acceso_propuesto:
        result = await db.execute(select(Denuncia).where(Denuncia.codigo_acceso == codigo_acceso_propuesto))
        if result.scalar_one_or_none():
            codigo_acceso_propuesto = None  # colisión improbable — genera uno nuevo

    denuncia = Denuncia(
        usuario_id=           usuario.id if usuario else None,
        token_anonimo=        token_anonimo,
        codigo_acceso=        codigo_acceso_propuesto or _generar_codigo_acceso(),
        device_id=            data.device_id,
        local_id=             data.local_id,
        tipo_violencia=       tipos_lista[0],
        tipos_violencia=      json.dumps(tipos_lista, ensure_ascii=False),
        relacion_agresor=     data.relacion_agresor.value,
        factores_riesgo=      json.dumps(factores_lista, ensure_ascii=False),
        nivel_riesgo=         nivel_riesgo,
        hay_heridos=          data.hay_heridos,
        foto_url=             data.foto_url,
        audio_url=            data.audio_url,
        latitud=              data.latitud,
        longitud=             data.longitud,
        preferencia_contacto= data.preferencia_contacto.value,
        horario_contacto=     data.horario_contacto,
        descripcion=          data.descripcion,
        es_anonima=           usuario is None,
    )

    if data.latitud is not None and data.longitud is not None:
        denuncia.ubicacion = ST_SetSRID(ST_MakePoint(data.longitud, data.latitud), 4326)

    db.add(denuncia)
    await db.flush()
    await db.refresh(denuncia)

    return ApiResponse(
        data=DenunciaResponse.from_orm_extended(denuncia),
        mensaje="Denuncia registrada correctamente",
    )


# ─── Mis denuncias ────────────────────────────────────────────────────────────

@router.get("/mis-denuncias", response_model=ApiResponse[PaginatedData[DenunciaResumen]])
async def mis_denuncias(
    pagina:    int = Query(1, ge=1),
    porPagina: int = Query(20, ge=1, le=100),
    authorization: Optional[str] = Header(default=None),
    device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    db: AsyncSession = Depends(get_db),
):
    offset  = (pagina - 1) * porPagina
    usuario = await _resolve_optional_user(authorization, db)

    if usuario:
        base_q = select(Denuncia).where(Denuncia.usuario_id == usuario.id)
    elif device_id:
        base_q = select(Denuncia).where(Denuncia.device_id == device_id)
    else:
        return ApiResponse(data=PaginatedData(data=[], total=0, pagina=pagina, porPagina=porPagina))

    count_result = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base_q.order_by(Denuncia.fecha_denuncia.desc()).offset(offset).limit(porPagina)
    )
    denuncias = result.scalars().all()

    return ApiResponse(data=PaginatedData(
        data=[DenunciaResumen.from_orm_extended(d) for d in denuncias],
        total=total, pagina=pagina, porPagina=porPagina,
    ))


# ─── Acceso anónimo por código corto ─────────────────────────────────────────

@router.get("/acceso-anonimo", response_model=ApiResponse[DenunciaResumen])
async def acceso_anonimo(
    codigo: str = Query(..., min_length=4, max_length=6),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Denuncia).where(Denuncia.codigo_acceso == codigo.upper())
    )
    denuncia = result.scalar_one_or_none()
    if not denuncia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Código no encontrado")
    return ApiResponse(data=DenunciaResumen.from_orm_extended(denuncia))


# ─── Obtener por token anónimo (público) ──────────────────────────────────────

@router.get("/token/{token_anonimo}", response_model=ApiResponse[DenunciaResumen])
async def get_por_token(token_anonimo: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Denuncia).where(Denuncia.token_anonimo == token_anonimo))
    denuncia = result.scalar_one_or_none()
    if not denuncia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denuncia no encontrada")
    return ApiResponse(data=DenunciaResumen.from_orm_extended(denuncia))


# ─── Obtener por ID ───────────────────────────────────────────────────────────

@router.get("/{denuncia_id}", response_model=ApiResponse[DenunciaResponse])
async def get_denuncia(
    denuncia_id: uuid.UUID,
    authorization: Optional[str] = Header(default=None),
    x_device_id: Optional[str]   = Header(default=None, alias="X-Device-Id"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Denuncia).where(Denuncia.id == denuncia_id))
    denuncia = result.scalar_one_or_none()
    if not denuncia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denuncia no encontrada")

    usuario              = await _resolve_optional_user(authorization, db)
    es_propietario       = usuario is not None and denuncia.usuario_id == usuario.id
    es_mismo_dispositivo = x_device_id is not None and denuncia.device_id == x_device_id
    es_staff             = usuario is not None and usuario.rol in ("operador", "admin")
    if not es_propietario and not es_mismo_dispositivo and not es_staff:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a esta denuncia")

    return ApiResponse(data=DenunciaResponse.from_orm_extended(denuncia))


# ─── Mensajes de un caso ──────────────────────────────────────────────────────

@router.get("/{denuncia_id}/mensajes", response_model=ApiResponse[list[MensajeResponse]])
async def get_mensajes(
    denuncia_id: uuid.UUID,
    authorization: Optional[str] = Header(default=None),
    x_device_id: Optional[str]   = Header(default=None, alias="X-Device-Id"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Denuncia).where(Denuncia.id == denuncia_id))
    denuncia = result.scalar_one_or_none()
    if not denuncia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denuncia no encontrada")

    usuario              = await _resolve_optional_user(authorization, db)
    es_propietario       = usuario is not None and denuncia.usuario_id == usuario.id
    es_mismo_dispositivo = x_device_id is not None and denuncia.device_id == x_device_id
    es_staff             = usuario is not None and usuario.rol in ("operador", "admin")
    if not es_propietario and not es_mismo_dispositivo and not es_staff:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso")

    result = await db.execute(
        select(MensajeCaso)
        .where(MensajeCaso.denuncia_id == denuncia_id)
        .order_by(MensajeCaso.created_at.asc())
    )
    mensajes = result.scalars().all()
    return ApiResponse(data=[MensajeResponse.model_validate(m) for m in mensajes])


# ─── Respuesta de la usuaria a un caso ───────────────────────────────────────

@router.post("/{denuncia_id}/mensajes/responder", response_model=ApiResponse[MensajeResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def responder_mensaje(
    request: Request,
    denuncia_id: uuid.UUID,
    data: MensajeResponderCreate,
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Denuncia).where(Denuncia.id == denuncia_id))
    denuncia = result.scalar_one_or_none()
    if not denuncia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denuncia no encontrada")

    usuario = await _resolve_optional_user(authorization, db)
    es_propietario = usuario and denuncia.usuario_id == usuario.id

    # Acceso: usuaria autenticada que es propietaria, O acceso por token_anonimo
    if not es_propietario:
        if not data.token_anonimo or data.token_anonimo != denuncia.token_anonimo:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a esta denuncia")

    mensaje = MensajeCaso(
        denuncia_id=     denuncia_id,
        autor=           "usuaria",
        contenido=       data.contenido,
        destruir_al_leer=False,
    )
    db.add(mensaje)
    await db.flush()
    await db.refresh(mensaje)

    # Notificar al operador asignado si tiene push token registrado
    if denuncia.operador_id:
        operador_result = await db.execute(
            select(Usuario).where(Usuario.id == denuncia.operador_id)
        )
        operador = operador_result.scalar_one_or_none()
        if operador and operador.push_token:
            await enviar_notificacion_respuesta_operador(
                push_token=    operador.push_token,
                denuncia_id=   str(denuncia_id),
                codigo_acceso= denuncia.codigo_acceso,
            )

    return ApiResponse(data=MensajeResponse.model_validate(mensaje))


# ─── Marcar mensaje como leído ────────────────────────────────────────────────

@router.patch("/mensajes/{mensaje_id}/leer", status_code=status.HTTP_204_NO_CONTENT)
async def marcar_leido(
    mensaje_id: uuid.UUID,
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MensajeCaso).where(MensajeCaso.id == mensaje_id))
    mensaje = result.scalar_one_or_none()
    if not mensaje:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mensaje no encontrado")

    mensaje.leido = True

    if mensaje.destruir_al_leer:
        mensaje.contenido = "[Mensaje eliminado]"

    await db.flush()
    return None
