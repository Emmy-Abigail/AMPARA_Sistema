import asyncio
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import and_, func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, hash_password
from app.services.notifications import enviar_notificacion_estado
from app.models.audit_log import AuditLog
from app.models.caso_netlab import CasoNetlab
from app.models.caso_noti import CasoNoti
from app.models.reporte import Reporte
from app.models.usuario import Usuario
from app.schemas.enums import EstadoReporteEnum, ObservaLarvasEnum, RolEnum
from app.schemas.reporte import ReporteUpdate
from app.schemas.usuario import UsuarioResponse

router = APIRouter(tags=["Dashboard"])


# ─── Auth: requiere inspector o admin ────────────────────────────────────────

async def get_staff_user(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if current_user.rol not in (RolEnum.INSPECTOR.value, RolEnum.ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido al personal autorizado.",
        )
    return current_user


# ─── Helpers de filtro ────────────────────────────────────────────────────────

def _reporte_filtros(
    fecha_desde: date | None,
    fecha_hasta: date | None,
    departamento: str | None,
    provincia: str | None,
    distrito: str | None,
):
    """Construye lista de condiciones SQLAlchemy para Reporte + join Usuario."""
    conds = []
    if fecha_desde:
        conds.append(Reporte.fecha_reporte >= datetime(fecha_desde.year, fecha_desde.month, fecha_desde.day, tzinfo=timezone.utc))
    if fecha_hasta:
        fin = datetime(fecha_hasta.year, fecha_hasta.month, fecha_hasta.day, 23, 59, 59, tzinfo=timezone.utc)
        conds.append(Reporte.fecha_reporte <= fin)
    if departamento:
        conds.append(Usuario.departamento.ilike(f"%{departamento}%"))
    if provincia:
        conds.append(Usuario.provincia.ilike(f"%{provincia}%"))
    if distrito:
        conds.append(Usuario.distrito.ilike(f"%{distrito}%"))
    return conds


def _noti_filtros(
    fecha_desde: date | None,
    fecha_hasta: date | None,
    departamento: str | None,
    provincia: str | None,
    distrito: str | None,
):
    conds = []
    if departamento:
        conds.append(CasoNoti.departamento.ilike(f"%{departamento}%"))
    if provincia:
        conds.append(CasoNoti.provincia.ilike(f"%{provincia}%"))
    if distrito:
        conds.append(CasoNoti.distrito.ilike(f"%{distrito}%"))
    return conds


def _netlab_filtros(
    fecha_desde: date | None,
    fecha_hasta: date | None,
    departamento: str | None,
    provincia: str | None,
    distrito: str | None,
):
    conds = []
    if fecha_desde:
        conds.append(CasoNetlab.fecha_corte >= datetime(fecha_desde.year, fecha_desde.month, fecha_desde.day, tzinfo=timezone.utc))
    if fecha_hasta:
        fin = datetime(fecha_hasta.year, fecha_hasta.month, fecha_hasta.day, 23, 59, 59, tzinfo=timezone.utc)
        conds.append(CasoNetlab.fecha_corte <= fin)
    if departamento:
        conds.append(CasoNetlab.departamento_paciente.ilike(f"%{departamento}%"))
    if provincia:
        conds.append(CasoNetlab.provincia_paciente.ilike(f"%{provincia}%"))
    if distrito:
        conds.append(CasoNetlab.distrito_paciente.ilike(f"%{distrito}%"))
    return conds


# ─── Parámetros de filtro compartidos ────────────────────────────────────────

def filtros_comunes(
    fecha_desde: date | None = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_hasta: date | None = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    departamento: str | None = Query(None),
    provincia: str | None = Query(None),
    distrito: str | None = Query(None),
):
    return {
        "fecha_desde": fecha_desde,
        "fecha_hasta": fecha_hasta,
        "departamento": departamento,
        "provincia": provincia,
        "distrito": distrito,
    }


# ─── KPIs ─────────────────────────────────────────────────────────────────────

@router.get("/kpis", summary="KPIs del sistema con filtros opcionales")
async def get_kpis(
    filtros: dict = Depends(filtros_comunes),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_staff_user),
):
    r_conds = _reporte_filtros(**filtros)
    n_conds = _noti_filtros(**filtros)
    nl_conds = _netlab_filtros(**filtros)
    nl_conds_pos = nl_conds + [CasoNetlab.dx_molecular_dengue == "Positivo"]
    r_larvas_conds = r_conds + [Reporte.observa_larvas == ObservaLarvasEnum.SI_CLARAMENTE.value]

    # outerjoin (LEFT JOIN): incluye reportes donde usuario_id = NULL (ciudadano
    # eliminó su cuenta). Con INNER JOIN esos reportes desaparecerían de los KPIs.
    base_r = select(func.count()).select_from(Reporte).outerjoin(Usuario, Reporte.usuario_id == Usuario.id)
    base_n = select(func.count()).select_from(CasoNoti)
    base_nl = select(func.count()).select_from(CasoNetlab)

    # Ejecutar los 4 COUNTs en paralelo con asyncio.gather.
    # SQLAlchemy 2.0 AsyncSession con asyncpg soporta operaciones concurrentes.
    # Sin gather, estos 4 round-trips a la BD son secuenciales (4x latencia).
    total_reportes, reportes_larvas, casos_sospechosos, casos_confirmados = await asyncio.gather(
        db.scalar(base_r.where(and_(*r_conds)) if r_conds else base_r),
        db.scalar(base_r.where(and_(*r_larvas_conds)) if r_larvas_conds else base_r.where(Reporte.observa_larvas == ObservaLarvasEnum.SI_CLARAMENTE.value)),
        db.scalar(base_n.where(and_(*n_conds)) if n_conds else base_n),
        db.scalar(base_nl.where(and_(*nl_conds_pos)) if nl_conds_pos else base_nl.where(CasoNetlab.dx_molecular_dengue == "Positivo")),
    )

    return {
        "total_reportes": total_reportes or 0,
        "reportes_con_larvas": reportes_larvas or 0,
        "casos_sospechosos": casos_sospechosos or 0,
        "casos_confirmados": casos_confirmados or 0,
    }


# ─── Mapa: Reportes ciudadanos ────────────────────────────────────────────────

@router.get("/mapa/reportes", summary="Puntos de reportes ciudadanos para el mapa")
async def mapa_reportes(
    filtros: dict = Depends(filtros_comunes),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_staff_user),
):
    conds = _reporte_filtros(**filtros)
    stmt = (
        select(
            Reporte.id,
            Reporte.latitud,
            Reporte.longitud,
            Reporte.tipo_lugar,
            Reporte.tipo_objeto,
            Reporte.observa_larvas,
            Reporte.estado,
            Reporte.foto_url,
            Reporte.comentarios,
            Reporte.direccion,
            Reporte.fecha_reporte,
            Usuario.nombre.label("reporter_nombre"),
            Usuario.departamento.label("reporter_depto"),
            Usuario.provincia.label("reporter_prov"),
            Usuario.distrito.label("reporter_dist"),
        )
        .select_from(Reporte)
        .outerjoin(Usuario, Reporte.usuario_id == Usuario.id)
        .where(and_(*conds) if conds else True)
        .order_by(Reporte.fecha_reporte.desc())
        .limit(2000)
    )
    rows = (await db.execute(stmt)).all()

    return [
        {
            "id": str(r.id),
            "lat": r.latitud,
            "lng": r.longitud,
            "tipo_lugar": r.tipo_lugar,
            "tipo_objeto": r.tipo_objeto,
            "observa_larvas": r.observa_larvas,
            "estado": r.estado,
            "foto_url": r.foto_url,
            "comentarios": r.comentarios,
            "direccion": r.direccion,
            "fecha_reporte": r.fecha_reporte.isoformat() if r.fecha_reporte else None,
            "reporter": {
                "nombre": r.reporter_nombre or "Usuario eliminado",
                "departamento": r.reporter_depto or "—",
                "provincia": r.reporter_prov or "—",
                "distrito": r.reporter_dist or "—",
            },
        }
        for r in rows
    ]


# ─── Mapa: Casos NOTI ────────────────────────────────────────────────────────

@router.get("/mapa/noti", summary="Casos NOTI agrupados por provincia para el mapa")
async def mapa_noti(
    filtros: dict = Depends(filtros_comunes),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_staff_user),
):
    conds = _noti_filtros(**filtros)
    stmt = (
        select(
            CasoNoti.departamento,
            CasoNoti.provincia,
            CasoNoti.ubigeo,
            CasoNoti.tipo_diagnostico,
            func.count(CasoNoti.id).label("total"),
        )
        .where(and_(*conds) if conds else True)
        .group_by(CasoNoti.departamento, CasoNoti.provincia, CasoNoti.ubigeo, CasoNoti.tipo_diagnostico)
        .order_by(func.count(CasoNoti.id).desc())
        .limit(500)
    )
    rows = (await db.execute(stmt)).all()

    return [
        {
            "departamento": r.departamento,
            "provincia": r.provincia,
            "ubigeo": r.ubigeo,
            "tipo_diagnostico": r.tipo_diagnostico,
            "total": r.total,
        }
        for r in rows
    ]


# ─── Mapa: Casos NETLAB ───────────────────────────────────────────────────────

@router.get("/mapa/netlab", summary="Casos NETLAB confirmados agrupados para el mapa")
async def mapa_netlab(
    filtros: dict = Depends(filtros_comunes),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_staff_user),
):
    conds = _netlab_filtros(**filtros)
    conds_pos = conds + [CasoNetlab.dx_molecular_dengue == "Positivo"]
    stmt = (
        select(
            CasoNetlab.departamento_paciente.label("departamento"),
            CasoNetlab.provincia_paciente.label("provincia"),
            CasoNetlab.distrito_paciente.label("distrito"),
            CasoNetlab.ubigeo_paciente.label("ubigeo"),
            CasoNetlab.serotipo_dengue,
            func.count(CasoNetlab.id).label("total"),
        )
        .where(and_(*conds_pos))
        .group_by(
            CasoNetlab.departamento_paciente,
            CasoNetlab.provincia_paciente,
            CasoNetlab.distrito_paciente,
            CasoNetlab.ubigeo_paciente,
            CasoNetlab.serotipo_dengue,
        )
        .order_by(func.count(CasoNetlab.id).desc())
        .limit(500)
    )
    rows = (await db.execute(stmt)).all()

    return [
        {
            "departamento": r.departamento,
            "provincia": r.provincia,
            "distrito": r.distrito,
            "ubigeo": r.ubigeo,
            "serotipo": r.serotipo_dengue,
            "total": r.total,
        }
        for r in rows
    ]


# ─── Feed de acción en tiempo real ────────────────────────────────────────────

@router.get("/feed", summary="Últimos reportes para el feed de acción")
async def feed_reportes(
    limit: int = Query(30, ge=1, le=100),
    estado: str | None = Query(None, description="Filtrar por estado (None = todos)"),
    filtros: dict = Depends(filtros_comunes),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_staff_user),
):
    conds = _reporte_filtros(**filtros)
    ESTADOS_VALIDOS = {"enviado", "en_revision", "resuelto", "rechazado", "cancelado"}
    if estado and estado in ESTADOS_VALIDOS:
        conds.append(Reporte.estado == estado)

    # Subqueries correlacionadas: último cambio de estado por reporte.
    # Para el feed de 30 items el costo es mínimo y evita un JOIN complejo.
    last_actor_nombre_sq = (
        select(AuditLog.actor_nombre)
        .where(AuditLog.reporte_id == Reporte.id)
        .order_by(AuditLog.timestamp.desc())
        .limit(1)
        .correlate(Reporte)
        .scalar_subquery()
    )
    last_actor_email_sq = (
        select(AuditLog.actor_email)
        .where(AuditLog.reporte_id == Reporte.id)
        .order_by(AuditLog.timestamp.desc())
        .limit(1)
        .correlate(Reporte)
        .scalar_subquery()
    )

    stmt = (
        select(
            Reporte.id,
            Reporte.tipo_lugar,
            Reporte.tipo_objeto,
            Reporte.observa_larvas,
            Reporte.conocimiento_dengue_cercano,
            Reporte.comentarios,
            Reporte.estado,
            Reporte.foto_url,
            Reporte.latitud,
            Reporte.longitud,
            Reporte.direccion,
            Reporte.fecha_reporte,
            Reporte.fecha_actualizacion,
            Usuario.nombre.label("reporter_nombre"),
            Usuario.email.label("reporter_email"),
            Usuario.departamento.label("reporter_depto"),
            Usuario.provincia.label("reporter_prov"),
            Usuario.distrito.label("reporter_dist"),
            last_actor_nombre_sq.label("last_actor_nombre"),
            last_actor_email_sq.label("last_actor_email"),
        )
        .select_from(Reporte)
        .outerjoin(Usuario, Reporte.usuario_id == Usuario.id)
        .where(and_(*conds) if conds else True)
        .order_by(Reporte.fecha_reporte.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()

    return [
        {
            "id": str(r.id),
            "tipo_lugar": r.tipo_lugar,
            "tipo_objeto": r.tipo_objeto,
            "observa_larvas": r.observa_larvas,
            "conocimiento_dengue_cercano": r.conocimiento_dengue_cercano,
            "comentarios": r.comentarios,
            "estado": r.estado,
            "foto_url": r.foto_url,
            "lat": r.latitud,
            "lng": r.longitud,
            "direccion": r.direccion,
            "fecha_reporte": r.fecha_reporte.isoformat() if r.fecha_reporte else None,
            "fecha_actualizacion": r.fecha_actualizacion.isoformat() if r.fecha_actualizacion else None,
            "reporter": {
                "nombre": r.reporter_nombre or "Usuario eliminado",
                "email": r.reporter_email or "—",
                "departamento": r.reporter_depto or "—",
                "provincia": r.reporter_prov or "—",
                "distrito": r.reporter_dist or "—",
            },
            "last_actor": {
                "nombre": r.last_actor_nombre,
                "email": r.last_actor_email,
            } if r.last_actor_email else None,
        }
        for r in rows
    ]


# ─── Tendencias semanales ─────────────────────────────────────────────────────

@router.get("/tendencias", summary="Tendencias semanales de las últimas 12 semanas")
async def tendencias(
    semanas: int = Query(12, ge=4, le=52),
    filtros: dict = Depends(filtros_comunes),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_staff_user),
):
    desde = datetime.now(timezone.utc) - timedelta(weeks=semanas)

    r_conds = _reporte_filtros(**{**filtros, "fecha_desde": None})
    n_conds = _noti_filtros(**filtros)
    nl_conds = _netlab_filtros(**{**filtros, "fecha_desde": None})

    # literal_column("'week'") evita que SQLAlchemy pase 'week' como parámetro
    # ($1, $3, $4 distintos), lo que confunde a PostgreSQL al comparar las
    # expresiones de SELECT, GROUP BY y ORDER BY entre sí.
    _week = literal_column("'week'")

    # Reportes por semana
    _semana_r = func.date_trunc(_week, Reporte.fecha_reporte)
    stmt_r = (
        select(
            _semana_r.label("semana"),
            func.count(Reporte.id).label("total"),
        )
        .select_from(Reporte)
        .outerjoin(Usuario, Reporte.usuario_id == Usuario.id)
        .where(Reporte.fecha_reporte >= desde, *(r_conds))
        .group_by(_semana_r)
        .order_by(_semana_r)
    )

    # Casos NOTI por semana
    stmt_n = (
        select(
            CasoNoti.ano_epidemiologico,
            CasoNoti.semana_epidemiologica,
            func.count(CasoNoti.id).label("total"),
        )
        .where(*n_conds if n_conds else [True])
        .group_by(CasoNoti.ano_epidemiologico, CasoNoti.semana_epidemiologica)
        .order_by(CasoNoti.ano_epidemiologico, CasoNoti.semana_epidemiologica)
        .limit(semanas)
    )

    # Casos NETLAB por semana
    _semana_nl = func.date_trunc(_week, CasoNetlab.fecha_corte)
    stmt_nl = (
        select(
            _semana_nl.label("semana"),
            func.count(CasoNetlab.id).label("total"),
        )
        .where(
            CasoNetlab.fecha_corte >= desde,
            CasoNetlab.dx_molecular_dengue == "Positivo",
            *(nl_conds),
        )
        .group_by(_semana_nl)
        .order_by(_semana_nl)
    )

    rows_r = (await db.execute(stmt_r)).all()
    rows_n = (await db.execute(stmt_n)).all()
    rows_nl = (await db.execute(stmt_nl)).all()

    return {
        "reportes": [
            {"semana": r.semana.isoformat() if r.semana else None, "total": r.total}
            for r in rows_r
        ],
        "noti": [
            {"ano": r.ano_epidemiologico, "semana_epi": r.semana_epidemiologica, "total": r.total}
            for r in rows_n
        ],
        "netlab": [
            {"semana": r.semana.isoformat() if r.semana else None, "total": r.total}
            for r in rows_nl
        ],
    }


# ─── Actualizar estado de reporte (inspector/admin) ───────────────────────────

@router.patch("/reportes/{reporte_id}/estado", summary="Actualiza el estado de un reporte")
async def actualizar_estado_dashboard(
    reporte_id: uuid.UUID,
    data: ReporteUpdate,
    db: AsyncSession = Depends(get_db),
    actor: Usuario = Depends(get_staff_user),
):
    # outerjoin: permite actualizar el estado de reportes cuyos ciudadanos
    # eliminaron su cuenta (usuario_id = NULL). Con inner join esos reportes
    # serían invisibles para el dashboard y no se podrían gestionar.
    result = await db.execute(
        select(Reporte, Usuario)
        .outerjoin(Usuario, Reporte.usuario_id == Usuario.id)
        .where(Reporte.id == reporte_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado.")

    reporte, dueno = row
    if data.estado is None:
        return {"id": str(reporte.id), "estado": reporte.estado}

    estado_anterior = reporte.estado
    reporte.estado = data.estado.value

    # Registro inmutable de auditoría — quién cambió qué y cuándo.
    db.add(AuditLog(
        reporte_id=reporte.id,
        actor_id=actor.id,
        actor_email=actor.email,
        actor_nombre=actor.nombre,
        estado_anterior=estado_anterior,
        estado_nuevo=data.estado.value,
    ))

    await db.flush()
    await db.refresh(reporte)

    # Notificar al dueño sólo si existe y tiene push token registrado.
    if dueno is not None and dueno.push_token:
        await enviar_notificacion_estado(
            dueno.push_token,
            data.estado.value,
            extra={"reporte_id": str(reporte.id)},
        )

    return {"id": str(reporte.id), "estado": reporte.estado}


@router.get(
    "/reportes/{reporte_id}/historial",
    summary="Historial de cambios de estado de un reporte",
)
async def historial_reporte(
    reporte_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_staff_user),
):
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.reporte_id == reporte_id)
        .order_by(AuditLog.timestamp.asc())
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(log.id),
            "actor_email": log.actor_email,
            "estado_anterior": log.estado_anterior,
            "estado_nuevo": log.estado_nuevo,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]


# ─── Ubicaciones únicas (para autocomplete de filtros) ────────────────────────

@router.get("/ubicaciones", summary="Lista de departamentos/provincias en los datos")
async def ubicaciones(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_staff_user),
):
    deptos_r = (await db.execute(
        select(Usuario.departamento).distinct().where(Usuario.departamento.isnot(None))
    )).scalars().all()
    deptos_n = (await db.execute(
        select(CasoNoti.departamento).distinct()
    )).scalars().all()
    deptos_nl = (await db.execute(
        select(CasoNetlab.departamento_paciente).distinct()
    )).scalars().all()

    departamentos = sorted(set(deptos_r + deptos_n + deptos_nl))
    return {"departamentos": departamentos}


# ─── Gestión de personal (solo admin) ────────────────────────────────────────

async def get_admin_user(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if current_user.rol != RolEnum.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores.")
    return current_user


class CrearPersonalRequest(BaseModel):
    nombre: str = Field(..., max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8)
    rol: RolEnum = RolEnum.INSPECTOR


@router.post(
    "/personal",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin crea un nuevo inspector o admin",
)
async def crear_personal(
    data: CrearPersonalRequest,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_admin_user),
):
    if data.rol == RolEnum.CIUDADANO:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Use la app móvil para registrar ciudadanos.")

    existing = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado.")

    user = Usuario(
        nombre=data.nombre,
        email=data.email,
        hashed_password=hash_password(data.password),
        rol=data.rol.value,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return UsuarioResponse.model_validate(user)


@router.get("/personal", summary="Lista de inspectores y admins")
async def listar_personal(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_admin_user),
):
    result = await db.execute(
        select(Usuario)
        .where(Usuario.rol.in_([RolEnum.INSPECTOR.value, RolEnum.ADMIN.value]))
        .order_by(Usuario.fecha_registro.desc())
    )
    users = result.scalars().all()
    return [UsuarioResponse.model_validate(u) for u in users]


@router.patch("/personal/{user_id}/estado", summary="Admin activa/desactiva un usuario del personal")
async def toggle_personal(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: Usuario = Depends(get_admin_user),
):
    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if user.id == current_admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes desactivar tu propia cuenta.")
    user.es_activo = not user.es_activo
    await db.flush()
    return {"id": str(user.id), "es_activo": user.es_activo}
