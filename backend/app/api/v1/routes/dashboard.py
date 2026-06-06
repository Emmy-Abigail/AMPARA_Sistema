import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, hash_password
from app.models.alerta_sos import AlertaSos
from app.models.denuncia import Denuncia
from app.models.mensaje_caso import MensajeCaso
from app.models.usuario import Usuario
from app.schemas.denuncia import DenunciaAsignarUpdate, DenunciaEstadoUpdate, DenunciaResponse
from app.schemas.mensaje import MensajeCreate, MensajeResponse
from app.schemas.responses import ApiResponse, PaginatedData

router = APIRouter(tags=["Dashboard"])


# ─── Guards de acceso ─────────────────────────────────────────────────────────

def _require_operador(current: Usuario = Depends(get_current_user)) -> Usuario:
    if current.rol not in ("operador", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol operador o admin")
    return current


def _require_admin(current: Usuario = Depends(get_current_user)) -> Usuario:
    if current.rol != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol admin")
    return current


# ─── KPIs ─────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=ApiResponse[dict])
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_require_operador),
):
    total_result    = await db.execute(select(func.count(Denuncia.id)))
    total           = total_result.scalar_one()

    urgentes_result = await db.execute(select(func.count(Denuncia.id)).where(Denuncia.nivel_riesgo == "urgente"))
    urgentes        = urgentes_result.scalar_one()

    activas_result  = await db.execute(
        select(func.count(Denuncia.id)).where(Denuncia.estado.notin_(["cerrada"]))
    )
    activas = activas_result.scalar_one()

    hoy_result = await db.execute(
        select(func.count(Denuncia.id)).where(
            Denuncia.fecha_denuncia >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        )
    )
    hoy = hoy_result.scalar_one()

    estados_result = await db.execute(
        select(Denuncia.estado, func.count(Denuncia.id)).group_by(Denuncia.estado)
    )
    por_estado = {row[0]: row[1] for row in estados_result.all()}

    tipos_result = await db.execute(
        select(Denuncia.tipo_violencia, func.count(Denuncia.id)).group_by(Denuncia.tipo_violencia)
    )
    por_tipo = {row[0]: row[1] for row in tipos_result.all()}

    tendencia = []
    for i in range(6, -1, -1):
        dia    = date.today() - timedelta(days=i)
        inicio = datetime(dia.year, dia.month, dia.day, 0, 0, 0, tzinfo=timezone.utc)
        fin    = inicio + timedelta(days=1)
        cnt    = await db.execute(
            select(func.count(Denuncia.id)).where(
                Denuncia.fecha_denuncia >= inicio,
                Denuncia.fecha_denuncia < fin,
            )
        )
        tendencia.append({"fecha": dia.isoformat(), "total": cnt.scalar_one()})

    return ApiResponse(data={
        "total":      total,
        "activas":    activas,
        "urgentes":   urgentes,
        "hoy":        hoy,
        "por_estado": por_estado,
        "por_tipo":   por_tipo,
        "tendencia":  tendencia,
    })


# ─── Listar denuncias con filtros ─────────────────────────────────────────────

@router.get("/denuncias", response_model=ApiResponse[PaginatedData[DenunciaResponse]])
async def listar_denuncias(
    pagina:         int            = Query(1, ge=1),
    porPagina:      int            = Query(20, ge=1, le=100),
    estado:         Optional[str]  = Query(None),
    nivel_riesgo:   Optional[str]  = Query(None),
    tipo_violencia: Optional[str]  = Query(None),
    hay_heridos:    Optional[bool] = Query(None),
    fecha_desde:    Optional[date] = Query(None),
    fecha_hasta:    Optional[date] = Query(None),
    solo_activas:   bool           = Query(False),
    db:             AsyncSession   = Depends(get_db),
    current:        Usuario        = Depends(_require_operador),
):
    q = select(Denuncia)

    # Operadores ven solo sus casos + los sin asignar; admins ven todo
    if current.rol == "operador":
        q = q.where(
            or_(Denuncia.operador_id == current.id, Denuncia.estado == "nueva")
        )

    if solo_activas:   q = q.where(Denuncia.estado != "cerrada")
    if estado:         q = q.where(Denuncia.estado == estado)
    if nivel_riesgo:   q = q.where(Denuncia.nivel_riesgo == nivel_riesgo)
    if tipo_violencia: q = q.where(Denuncia.tipo_violencia == tipo_violencia)
    if hay_heridos is not None: q = q.where(Denuncia.hay_heridos == hay_heridos)
    if fecha_desde:
        q = q.where(Denuncia.fecha_denuncia >= datetime(fecha_desde.year, fecha_desde.month, fecha_desde.day, tzinfo=timezone.utc))
    if fecha_hasta:
        q = q.where(Denuncia.fecha_denuncia < datetime(fecha_hasta.year, fecha_hasta.month, fecha_hasta.day, tzinfo=timezone.utc) + timedelta(days=1))

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar_one()

    offset = (pagina - 1) * porPagina
    result = await db.execute(q.order_by(Denuncia.fecha_denuncia.desc()).offset(offset).limit(porPagina))
    denuncias = result.scalars().all()

    return ApiResponse(data=PaginatedData(
        data=[DenunciaResponse.from_orm_extended(d) for d in denuncias],
        total=total, pagina=pagina, porPagina=porPagina,
    ))


# ─── Datos para el mapa ───────────────────────────────────────────────────────

@router.get("/mapa", response_model=ApiResponse[list[dict]])
async def mapa_denuncias(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_require_operador),
):
    result = await db.execute(
        select(
            Denuncia.id, Denuncia.latitud, Denuncia.longitud,
            Denuncia.nivel_riesgo, Denuncia.tipo_violencia,
            Denuncia.hay_heridos, Denuncia.estado,
            Denuncia.relacion_agresor, Denuncia.fecha_denuncia,
        ).where(
            Denuncia.latitud.isnot(None),
            Denuncia.longitud.isnot(None),
        )
    )
    rows = result.all()
    return ApiResponse(data=[
        {
            "id":               str(r.id),
            "lat":              r.latitud,
            "lng":              r.longitud,
            "nivel_riesgo":     r.nivel_riesgo,
            "tipo_violencia":   r.tipo_violencia,
            "hay_heridos":      r.hay_heridos,
            "estado":           r.estado,
            "relacion_agresor": r.relacion_agresor,
            "fecha_denuncia":   r.fecha_denuncia.isoformat() if r.fecha_denuncia else None,
        }
        for r in rows
    ])


# ─── Cambiar estado de una denuncia ───────────────────────────────────────────

@router.patch("/denuncias/{denuncia_id}/estado", response_model=ApiResponse[DenunciaResponse])
async def cambiar_estado(
    denuncia_id: uuid.UUID,
    data: DenunciaEstadoUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_require_operador),
):
    result = await db.execute(select(Denuncia).where(Denuncia.id == denuncia_id))
    denuncia = result.scalar_one_or_none()
    if not denuncia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denuncia no encontrada")

    denuncia.estado              = data.estado.value
    denuncia.fecha_actualizacion = datetime.now(timezone.utc)
    if data.motivo_cierre:
        denuncia.motivo_cierre = data.motivo_cierre

    await db.flush()
    await db.refresh(denuncia)
    return ApiResponse(data=DenunciaResponse.from_orm_extended(denuncia))


# ─── Asignar operador ─────────────────────────────────────────────────────────

@router.patch("/denuncias/{denuncia_id}/asignar", response_model=ApiResponse[DenunciaResponse])
async def asignar_operador(
    denuncia_id: uuid.UUID,
    data: DenunciaAsignarUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_require_operador),
):
    result = await db.execute(select(Denuncia).where(Denuncia.id == denuncia_id))
    denuncia = result.scalar_one_or_none()
    if not denuncia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denuncia no encontrada")

    op_result = await db.execute(
        select(Usuario).where(Usuario.id == data.operador_id, Usuario.rol.in_(["operador", "admin"]))
    )
    if not op_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Operador no encontrado")

    denuncia.operador_id         = data.operador_id
    denuncia.estado              = "asignada"
    denuncia.fecha_actualizacion = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(denuncia)
    return ApiResponse(data=DenunciaResponse.from_orm_extended(denuncia))


# ─── Enviar mensaje a la víctima ──────────────────────────────────────────────

@router.post("/denuncias/{denuncia_id}/mensajes", response_model=ApiResponse[MensajeResponse], status_code=status.HTTP_201_CREATED)
async def enviar_mensaje(
    denuncia_id: uuid.UUID,
    data: MensajeCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_require_operador),
):
    result = await db.execute(select(Denuncia).where(Denuncia.id == denuncia_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denuncia no encontrada")

    mensaje = MensajeCaso(
        denuncia_id=      denuncia_id,
        autor=            "operador",
        contenido=        data.contenido,
        destruir_al_leer= data.destruir_al_leer,
    )
    db.add(mensaje)
    await db.flush()
    await db.refresh(mensaje)
    return ApiResponse(data=MensajeResponse.model_validate(mensaje), mensaje="Mensaje enviado")


# ─── Lista de operadores (para asignación) ────────────────────────────────────

@router.get("/operadores", response_model=ApiResponse[list[dict]])
async def listar_operadores(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_require_operador),
):
    result = await db.execute(
        select(Usuario.id, Usuario.nombre, Usuario.apellido, Usuario.email)
        .where(Usuario.rol.in_(["operador", "admin"]), Usuario.es_activo == True)
    )
    rows = result.all()
    return ApiResponse(data=[
        {"id": str(r.id), "nombre": r.nombre, "apellido": r.apellido, "email": r.email}
        for r in rows
    ])


# ─── Gestión de personal (solo admin) ────────────────────────────────────────

class PersonalCreate(BaseModel):
    nombre:   str      = Field(..., max_length=150)
    email:    EmailStr
    password: str      = Field(..., min_length=8)
    rol:      str      = Field("operador", pattern="^(operador|admin)$")


@router.get("/personal", response_model=ApiResponse[list[dict]])
async def listar_personal(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_require_admin),
):
    result = await db.execute(
        select(Usuario)
        .where(Usuario.rol.in_(["operador", "admin"]))
        .order_by(Usuario.fecha_registro.desc())
    )
    usuarios = result.scalars().all()
    return ApiResponse(data=[
        {
            "id":       str(u.id),
            "nombre":   u.nombre,
            "email":    u.email,
            "rol":      u.rol,
            "esActivo": u.es_activo,
            "creadoEn": u.fecha_registro.isoformat(),
        }
        for u in usuarios
    ])


@router.post("/personal", response_model=ApiResponse[dict], status_code=status.HTTP_201_CREATED)
async def crear_personal(
    data: PersonalCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_require_admin),
):
    existing = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado")

    user = Usuario(
        nombre=          data.nombre,
        email=           data.email,
        hashed_password= hash_password(data.password),
        rol=             data.rol,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return ApiResponse(
        data={"id": str(user.id), "nombre": user.nombre, "email": user.email, "rol": user.rol},
        mensaje="Cuenta creada correctamente",
    )


@router.patch("/personal/{usuario_id}/estado", response_model=ApiResponse[dict])
async def toggle_personal_estado(
    usuario_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_require_admin),
):
    result = await db.execute(
        select(Usuario).where(
            Usuario.id == usuario_id,
            Usuario.rol.in_(["operador", "admin"]),
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal no encontrado")

    user.es_activo = not user.es_activo
    await db.flush()
    return ApiResponse(data={"id": str(user.id), "esActivo": user.es_activo})


# ─── Alertas SOS activas ──────────────────────────────────────────────────────

@router.get("/sos", response_model=ApiResponse[list[dict]])
async def listar_sos_activas(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_require_operador),
):
    result = await db.execute(
        select(AlertaSos, Usuario.nombre, Denuncia.codigo_acceso)
        .outerjoin(Usuario,   AlertaSos.usuario_id  == Usuario.id)
        .outerjoin(Denuncia,  AlertaSos.denuncia_id == Denuncia.id)
        .where(AlertaSos.estado.in_(["activa", "en_atencion"]))
        .order_by(AlertaSos.fecha_activacion.desc())
        .limit(20)
    )
    rows = result.all()
    return ApiResponse(data=[
        {
            "id":               str(alerta.id),
            "estado":           alerta.estado,
            "usuario_nombre":   nombre,
            "latitud":          alerta.latitud,
            "longitud":         alerta.longitud,
            "sms_enviados":     alerta.sms_enviados,
            "fecha_activacion": alerta.fecha_activacion.isoformat(),
            "denuncia_id":      str(alerta.denuncia_id) if alerta.denuncia_id else None,
            "codigo_acceso":    codigo_acceso,
        }
        for alerta, nombre, codigo_acceso in rows
    ])


@router.patch("/sos/{alerta_id}/en-atencion", status_code=status.HTTP_204_NO_CONTENT)
async def marcar_sos_en_atencion(
    alerta_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_require_operador),
):
    result = await db.execute(select(AlertaSos).where(AlertaSos.id == alerta_id))
    alerta = result.scalar_one_or_none()
    if not alerta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta no encontrada")
    if alerta.estado != "activa":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La alerta no está activa")
    alerta.estado = "en_atencion"
    await db.flush()


@router.patch("/sos/{alerta_id}/resolver", status_code=status.HTTP_204_NO_CONTENT)
async def resolver_sos_dashboard(
    alerta_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_require_operador),
):
    result = await db.execute(select(AlertaSos).where(AlertaSos.id == alerta_id))
    alerta = result.scalar_one_or_none()
    if not alerta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta no encontrada")
    alerta.estado = "resuelta"
    alerta.fecha_resolucion = datetime.now(timezone.utc)

    # Si la denuncia vinculada sigue sin atender, cerrarla
    if alerta.denuncia_id:
        den_result = await db.execute(
            select(Denuncia).where(Denuncia.id == alerta.denuncia_id)
        )
        denuncia = den_result.scalar_one_or_none()
        if denuncia and denuncia.estado == "nueva":
            denuncia.estado = "cerrada"

    await db.flush()
