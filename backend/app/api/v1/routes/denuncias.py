import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, UploadFile, File, status
from geoalchemy2.functions import ST_MakePoint, ST_SetSRID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import get_current_user
from app.models.denuncia import Denuncia, _calcular_nivel_riesgo
from app.models.mensaje_caso import MensajeCaso
from app.models.usuario import Usuario
from app.schemas.denuncia import DenunciaCreate, DenunciaResumen, DenunciaResponse
from app.schemas.mensaje import MensajeResponse
from app.schemas.responses import ApiResponse, PaginatedData
from app.services.storage import storage

router = APIRouter(tags=["Denuncias"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_optional_user(
    authorization: Optional[str] = Header(default=None),
):
    """Intenta extraer el usuario del token; retorna None si no hay token.
    Permite que el endpoint acepte tanto requests autenticados como anónimos.
    """
    return authorization  # procesado manualmente en el endpoint


async def _resolve_optional_user(
    authorization: Optional[str],
    db: AsyncSession,
) -> Optional[Usuario]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        from jose import jwt, JWTError
        from app.core.config import settings
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str | None = payload.get("sub")
        if not email:
            return None
        result = await db.execute(select(Usuario).where(Usuario.email == email))
        return result.scalar_one_or_none()
    except Exception:
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
    if len(contenido) > 15 * 1024 * 1024:  # 15 MB
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
    if len(contenido) > 20 * 1024 * 1024:  # 20 MB
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
    # Idempotencia: si ya existe un reporte con el mismo device_id + local_id, devuelve el existente
    if data.device_id and data.local_id:
        result = await db.execute(
            select(Denuncia).where(
                Denuncia.device_id == data.device_id,
                Denuncia.local_id == data.local_id,
            )
        )
        existente = result.scalar_one_or_none()
        if existente:
            return ApiResponse(data=DenunciaResponse.model_validate(existente))

    # Resolver usuario si hay token
    usuario = await _resolve_optional_user(authorization, db)

    # Verificar unicidad del token_anonimo si viene del cliente
    token_anonimo = data.token_anonimo
    if token_anonimo:
        result = await db.execute(select(Denuncia).where(Denuncia.token_anonimo == token_anonimo))
        if result.scalar_one_or_none():
            # Token ya usado (muy improbable) — generar uno nuevo en el servidor
            token_anonimo = None

    if not token_anonimo:
        # Generar token en el servidor
        import random, string
        chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        token_anonimo = "AMP-" + "".join(random.choices(chars, k=4)) + "-" + "".join(random.choices(chars, k=4))

    nivel_riesgo = _calcular_nivel_riesgo(data.relacion_agresor.value, data.hay_heridos)

    denuncia = Denuncia(
        usuario_id=           usuario.id if usuario else None,
        token_anonimo=        token_anonimo,
        device_id=            data.device_id,
        local_id=             data.local_id,
        tipo_violencia=       data.tipo_violencia.value,
        relacion_agresor=     data.relacion_agresor.value,
        nivel_riesgo=         nivel_riesgo,
        hay_heridos=          data.hay_heridos,
        foto_url=             data.foto_url,
        audio_url=            data.audio_url,
        latitud=              data.latitud,
        longitud=             data.longitud,
        preferencia_contacto= data.preferencia_contacto.value,
        horario_contacto=     data.horario_contacto,
        es_anonima=           usuario is None,
    )

    # Construir punto PostGIS si hay coordenadas
    if data.latitud is not None and data.longitud is not None:
        denuncia.ubicacion = ST_SetSRID(ST_MakePoint(data.longitud, data.latitud), 4326)

    db.add(denuncia)
    await db.flush()
    await db.refresh(denuncia)

    return ApiResponse(
        data=DenunciaResponse.model_validate(denuncia),
        mensaje="Denuncia registrada correctamente",
    )


# ─── Mis denuncias ────────────────────────────────────────────────────────────

@router.get("/mis-denuncias", response_model=ApiResponse[PaginatedData[DenunciaResumen]])
async def mis_denuncias(
    pagina: int = 1,
    porPagina: int = 20,
    authorization: Optional[str] = Header(default=None),
    device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
    db: AsyncSession = Depends(get_db),
):
    if pagina < 1:
        pagina = 1
    offset = (pagina - 1) * porPagina

    usuario = await _resolve_optional_user(authorization, db)

    if usuario:
        base_q = select(Denuncia).where(Denuncia.usuario_id == usuario.id)
    elif device_id:
        base_q = select(Denuncia).where(Denuncia.device_id == device_id)
    else:
        return ApiResponse(data=PaginatedData(data=[], total=0, pagina=pagina, porPagina=porPagina))

    from sqlalchemy import func as sqlfunc
    count_result = await db.execute(select(sqlfunc.count()).select_from(base_q.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base_q.order_by(Denuncia.fecha_denuncia.desc()).offset(offset).limit(porPagina)
    )
    denuncias = result.scalars().all()

    return ApiResponse(data=PaginatedData(
        data=[DenunciaResumen.model_validate(d) for d in denuncias],
        total=total,
        pagina=pagina,
        porPagina=porPagina,
    ))


# ─── Obtener por token anónimo (público) ──────────────────────────────────────

@router.get("/token/{token_anonimo}", response_model=ApiResponse[DenunciaResumen])
async def get_por_token(token_anonimo: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Denuncia).where(Denuncia.token_anonimo == token_anonimo))
    denuncia = result.scalar_one_or_none()
    if not denuncia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denuncia no encontrada")
    return ApiResponse(data=DenunciaResumen.model_validate(denuncia))


# ─── Obtener por ID ───────────────────────────────────────────────────────────

@router.get("/{denuncia_id}", response_model=ApiResponse[DenunciaResponse])
async def get_denuncia(
    denuncia_id: uuid.UUID,
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Denuncia).where(Denuncia.id == denuncia_id))
    denuncia = result.scalar_one_or_none()
    if not denuncia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denuncia no encontrada")

    # Verificar acceso: propietario, operador asignado o admin
    usuario = await _resolve_optional_user(authorization, db)
    es_propietario   = usuario and denuncia.usuario_id == usuario.id
    es_operador_adm  = usuario and usuario.rol in ("operador", "admin")
    if not es_propietario and not es_operador_adm:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a esta denuncia")

    return ApiResponse(data=DenunciaResponse.model_validate(denuncia))


# ─── Mensajes de un caso ──────────────────────────────────────────────────────

@router.get("/{denuncia_id}/mensajes", response_model=ApiResponse[list[MensajeResponse]])
async def get_mensajes(
    denuncia_id: uuid.UUID,
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Denuncia).where(Denuncia.id == denuncia_id))
    denuncia = result.scalar_one_or_none()
    if not denuncia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denuncia no encontrada")

    usuario = await _resolve_optional_user(authorization, db)
    es_propietario  = usuario and denuncia.usuario_id == usuario.id
    es_operador_adm = usuario and usuario.rol in ("operador", "admin")
    if not es_propietario and not es_operador_adm:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso")

    result = await db.execute(
        select(MensajeCaso)
        .where(MensajeCaso.denuncia_id == denuncia_id)
        .order_by(MensajeCaso.created_at.asc())
    )
    mensajes = result.scalars().all()
    return ApiResponse(data=[MensajeResponse.model_validate(m) for m in mensajes])


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

    # Destruir el contenido si está marcado para autodestrucción
    if mensaje.destruir_al_leer:
        mensaje.contenido = "[Mensaje eliminado]"

    await db.flush()
    return None
