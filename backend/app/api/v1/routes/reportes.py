import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import and_, exc as sa_exc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import get_current_user
from app.models.reporte import Reporte
from app.models.usuario import Usuario
from app.schemas.enums import EstadoReporteEnum
from app.schemas.responses import ApiResponse, FotoResponse, PaginatedData
from app.schemas.reporte import AlertaZona, AlertasZonaResponse, ReporteCreate, ReporteResponse
from app.services.storage import storage

router = APIRouter(tags=["Reportes"])

_FOTO_MAX_BYTES = 10 * 1024 * 1024  # 10 MB — Pillow comprime antes de guardar
_FOTO_MIME_PERMITIDOS = {"image/jpeg", "image/png", "image/webp"}


# ─── Subida de foto (endpoint independiente) ──────────────────────────────────

@router.post(
    "/foto",
    response_model=ApiResponse[FotoResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Sube una foto y retorna su URL pública",
)
async def subir_foto(
    foto: UploadFile = File(...),
    _: Usuario = Depends(get_current_user),
):
    if foto.content_type not in _FOTO_MIME_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato no permitido. Use JPEG, PNG o WebP.",
        )

    contenido = await foto.read()
    if len(contenido) > _FOTO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La imagen no puede superar los 10 MB.",
        )

    try:
        url = await storage.guardar(contenido, foto.content_type or "image/jpeg")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se pudo guardar la imagen: {exc}",
        )

    return ApiResponse(data=FotoResponse(url=url))


# ─── Subir foto a un reporte existente (para sincronización offline) ──────────

@router.post(
    "/{reporte_id}/foto",
    response_model=ApiResponse[ReporteResponse],
    status_code=status.HTTP_200_OK,
    summary="Sube o reemplaza la foto de un reporte existente",
)
async def subir_foto_reporte(
    reporte_id: uuid.UUID,
    foto: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if foto.content_type not in _FOTO_MIME_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato no permitido. Use JPEG, PNG o WebP.",
        )

    contenido = await foto.read()
    if len(contenido) > _FOTO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La imagen no puede superar los 10 MB.",
        )

    result = await db.execute(select(Reporte).where(Reporte.id == reporte_id))
    reporte = result.scalar_one_or_none()
    if not reporte:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado.")
    if reporte.usuario_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para modificar este reporte.")

    if reporte.foto_url:
        await storage.eliminar(reporte.foto_url)

    try:
        url = await storage.guardar(contenido, foto.content_type or "image/jpeg")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se pudo guardar la imagen: {exc}",
        )

    reporte.foto_url = url
    await db.flush()
    await db.refresh(reporte)

    return ApiResponse(data=ReporteResponse.model_validate(reporte))


# ─── Crear reporte (idempotente) ──────────────────────────────────────────────

@router.post(
    "",
    response_model=ApiResponse[ReporteResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Crea un nuevo reporte de criadero (idempotente con device_id + local_id)",
)
@limiter.limit("30/minute")
async def crear_reporte(
    request: Request,  # requerido por slowapi para extraer la IP del cliente
    data: ReporteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Crea un reporte. Si se envían device_id y local_id, el endpoint es idempotente:
    reintentos de la misma app devuelven el reporte ya creado sin error y sin duplicar.

    La verificación previa + índice único + bloque IntegrityError son capas defensivas:
    - La consulta previa maneja el caso normal (reintento llega después del INSERT).
    - El IntegrityError captura la condición de carrera (dos requests simultáneos).
    """
    if data.device_id and data.local_id:
        existing_result = await db.execute(
            select(Reporte).where(
                and_(
                    Reporte.device_id == data.device_id,
                    Reporte.local_id == data.local_id,
                )
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            return ApiResponse(data=ReporteResponse.model_validate(existing))

    punto = WKTElement(f"POINT({data.longitud} {data.latitud})", srid=4326)

    reporte = Reporte(
        usuario_id=current_user.id,
        device_id=data.device_id,
        local_id=data.local_id,
        latitud=data.latitud,
        longitud=data.longitud,
        ubicacion=punto,
        foto_url=data.foto_url,
        tipo_lugar=data.tipo_lugar,
        tipo_objeto=data.tipo_objeto,
        observa_larvas=data.observa_larvas,
        conocimiento_dengue_cercano=data.conocimiento_dengue_cercano,
        comentarios=data.comentarios,
        direccion=data.direccion,
    )
    db.add(reporte)

    try:
        await db.flush()
    except sa_exc.IntegrityError:
        # Condición de carrera: dos requests simultáneos con el mismo (device_id, local_id).
        # El índice único rechazó el segundo INSERT — rollback y devolver el existente.
        await db.rollback()
        if data.device_id and data.local_id:
            result = await db.execute(
                select(Reporte).where(
                    and_(
                        Reporte.device_id == data.device_id,
                        Reporte.local_id == data.local_id,
                    )
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                return ApiResponse(data=ReporteResponse.model_validate(existing))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear el reporte. Intenta de nuevo.",
        )

    await db.refresh(reporte)
    return ApiResponse(data=ReporteResponse.model_validate(reporte))


# ─── Mis reportes (paginado) ──────────────────────────────────────────────────

@router.get(
    "/mis-reportes",
    response_model=ApiResponse[PaginatedData[ReporteResponse]],
    summary="Lista los reportes del usuario autenticado con paginación",
)
async def mis_reportes(
    pagina: int = Query(1, ge=1),
    porPagina: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    filtro = Reporte.usuario_id == current_user.id
    offset = (pagina - 1) * porPagina

    total, items = await asyncio.gather(
        db.scalar(select(func.count()).select_from(Reporte).where(filtro)),
        db.execute(
            select(Reporte)
            .where(filtro)
            .order_by(Reporte.fecha_reporte.desc())
            .offset(offset)
            .limit(porPagina)
        ),
    )

    reportes = [ReporteResponse.model_validate(r) for r in items.scalars().all()]

    return ApiResponse(
        data=PaginatedData(
            data=reportes,
            total=total or 0,
            pagina=pagina,
            porPagina=porPagina,
        )
    )


# ─── Alertas por zona ────────────────────────────────────────────────────────

@router.get(
    "/alertas-zona",
    response_model=AlertasZonaResponse,
    summary="Reportes de criaderos agrupados por zona (últimos 30 días)",
)
async def alertas_zona(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    desde = datetime.now(timezone.utc) - timedelta(days=30)

    stmt = (
        select(
            Usuario.departamento,
            Usuario.provincia,
            func.count(Reporte.id).label("total"),
        )
        .select_from(Reporte)
        .join(Usuario, Reporte.usuario_id == Usuario.id)
        .where(
            Reporte.fecha_reporte >= desde,
            Usuario.departamento.isnot(None),
            Usuario.provincia.isnot(None),
        )
        .group_by(Usuario.departamento, Usuario.provincia)
        .order_by(func.count(Reporte.id).desc())
        .limit(10)
    )

    result = await db.execute(stmt)
    rows = result.all()

    def _nivel_y_descripcion(total: int) -> tuple[str, str]:
        if total >= 10:
            return "Alto", f"{total} criaderos reportados en los últimos 30 días."
        if total >= 4:
            return "Medio", f"{total} criaderos reportados, situación en vigilancia."
        return "Bajo", f"{total} criadero(s) reportado(s), situación estable."

    alertas: list[AlertaZona] = []
    for departamento, provincia, total in rows:
        nivel, descripcion = _nivel_y_descripcion(total)
        alertas.append(
            AlertaZona(
                zona=f"{provincia}, {departamento}",
                departamento=departamento,
                provincia=provincia,
                nivel=nivel,
                descripcion=descripcion,
                total_reportes=total,
                es_mi_zona=(
                    departamento == current_user.departamento
                    and provincia == current_user.provincia
                ),
            )
        )

    alertas.sort(key=lambda a: (not a.es_mi_zona, -a.total_reportes))

    return AlertasZonaResponse(
        alertas=alertas[:5],
        tiene_zona=bool(current_user.departamento and current_user.provincia),
    )


# ─── Obtener reporte por ID ───────────────────────────────────────────────────

@router.get(
    "/{reporte_id}",
    response_model=ApiResponse[ReporteResponse],
    summary="Obtiene un reporte por su ID",
)
async def obtener_reporte(
    reporte_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Reporte).where(Reporte.id == reporte_id))
    reporte = result.scalar_one_or_none()
    if not reporte:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado.")
    return ApiResponse(data=ReporteResponse.model_validate(reporte))


# ─── Cancelar reporte (solo el dueño) ────────────────────────────────────────

@router.patch(
    "/{reporte_id}/cancelar",
    response_model=ApiResponse[ReporteResponse],
    summary="Cancela un reporte propio (solo el autor puede cancelarlo)",
)
async def cancelar_reporte(
    reporte_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Reporte).where(Reporte.id == reporte_id))
    reporte = result.scalar_one_or_none()

    if not reporte:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado.")
    if reporte.usuario_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para cancelar este reporte.")
    if reporte.estado not in (EstadoReporteEnum.ENVIADO, EstadoReporteEnum.ENVIADO.value):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Solo se pueden cancelar reportes en estado 'enviado'.")

    reporte.estado = EstadoReporteEnum.CANCELADO.value
    await db.flush()
    await db.refresh(reporte)

    return ApiResponse(data=ReporteResponse.model_validate(reporte))


# NOTA: El cambio de estado de un reporte lo gestiona exclusivamente el dashboard
# a través de PATCH /api/v1/dashboard/reportes/{id}/estado, que verifica rol de
# inspector/admin y envía notificación push al ciudadano. No existe un endpoint
# equivalente en este router para evitar que ciudadanos cambien el estado de
# reportes ajenos sin validación de rol.
