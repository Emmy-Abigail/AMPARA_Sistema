from datetime import timezone, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest
from app.schemas.enums import RolEnum
from app.schemas.responses import ApiResponse
from app.schemas.usuario import AuthResponse, CambiarPasswordRequest, UsuarioCreate, UsuarioResponse, UsuarioUpdate

router = APIRouter(tags=["Auth"])


# ─── Registro ─────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("5/minute")
async def register(request: Request, data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    """Rate limit: 5 registros por minuto por IP.
    Previene la creación masiva de cuentas falsas que podrían contaminar
    los datos epidemiológicos del sistema.
    """
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email ya está registrado",
        )

    user = Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        email=data.email,
        telefono=data.telefono,
        departamento=data.departamento,
        provincia=data.provincia,
        distrito=data.distrito,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    return AuthResponse(
        token=create_access_token({"sub": user.email}),
        refreshToken=create_refresh_token({"sub": user.email}),
        usuario=UsuarioResponse.model_validate(user),
    )


# ─── Login ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Rate limit: 10 intentos por minuto por IP.
    Protección básica contra ataques de fuerza bruta sobre contraseñas.
    Límite generoso para zonas con NAT compartido (un edificio público = una IP).
    """
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.es_activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo",
        )

    user.ultimo_acceso = datetime.now(timezone.utc)

    return AuthResponse(
        token=create_access_token({"sub": user.email}),
        refreshToken=create_refresh_token({"sub": user.email}),
        usuario=UsuarioResponse.model_validate(user),
    )


# ─── Refresh token ────────────────────────────────────────────────────────────

class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post(
    "/refresh",
    response_model=AuthResponse,
    summary="Renueva el access token usando el refresh token (sin re-login)",
)
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Emite un nuevo par (access_token, refresh_token) a partir de un refresh token válido.

    Por qué existe este endpoint:
    - El access token expira en 30 minutos por seguridad.
    - Sin refresh, el usuario tendría que re-loguearse cada 30 minutos.
    - Con refresh (válido 30 días), la app renueva el token automáticamente y de forma
      transparente para el usuario. Solo se hace logout real cuando el refresh también expira
      o el usuario lo hace manualmente.

    El refresh token se distingue del access token por el claim "type": "refresh".
    Un access token presentado aquí es rechazado aunque no haya expirado.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token inválido o expirado. Inicia sesión nuevamente.",
    )
    try:
        payload = jwt.decode(
            data.refresh_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        email: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")

        if not email:
            raise credentials_exception

        # Rechazar access tokens presentados como refresh.
        # Tokens emitidos antes de agregar el claim "type" (sin este campo) son aceptados
        # para backwards-compatibility con sesiones abiertas durante el despliegue.
        if token_type is not None and token_type != "refresh":
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    result = await db.execute(select(Usuario).where(Usuario.email == email))
    user = result.scalar_one_or_none()

    if not user or not user.es_activo:
        raise credentials_exception

    return AuthResponse(
        token=create_access_token({"sub": user.email}),
        refreshToken=create_refresh_token({"sub": user.email}),
        usuario=UsuarioResponse.model_validate(user),
    )


# ─── Logout ───────────────────────────────────────────────────────────────────

@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Cierra la sesión del usuario autenticado",
)
async def logout(_: Usuario = Depends(get_current_user)):
    return {"mensaje": "Sesión cerrada correctamente."}


# ─── Perfil ───────────────────────────────────────────────────────────────────

@router.get(
    "/perfil",
    response_model=ApiResponse[UsuarioResponse],
    summary="Retorna el perfil del usuario autenticado",
)
async def obtener_perfil(current_user: Usuario = Depends(get_current_user)):
    return ApiResponse(data=UsuarioResponse.model_validate(current_user))


@router.patch(
    "/perfil",
    response_model=ApiResponse[UsuarioResponse],
    summary="Actualiza nombre, teléfono y ubigeo del usuario autenticado",
)
async def actualizar_perfil(
    data: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cambios = data.model_dump(exclude_none=True)
    for campo, valor in cambios.items():
        setattr(current_user, campo, valor)
    await db.flush()
    await db.refresh(current_user)
    return ApiResponse(data=UsuarioResponse.model_validate(current_user))


@router.post(
    "/perfil/password",
    status_code=status.HTTP_200_OK,
    summary="Cambia la contraseña del usuario autenticado",
)
async def cambiar_password(
    data: CambiarPasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if not verify_password(data.password_actual, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta",
        )
    current_user.hashed_password = hash_password(data.password_nuevo)
    await db.flush()
    return {"mensaje": "Contraseña actualizada correctamente"}


# ─── Push token ───────────────────────────────────────────────────────────────

class PushTokenRequest(BaseModel):
    token: str = Field(..., max_length=200)


@router.post(
    "/push-token",
    status_code=status.HTTP_200_OK,
    summary="Guarda o actualiza el Expo push token del dispositivo",
)
async def guardar_push_token(
    data: PushTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    current_user.push_token = data.token
    await db.flush()
    return {"mensaje": "Token registrado correctamente"}


# ─── Setup inicial: crear primer admin ───────────────────────────────────────

class SetupAdminRequest(BaseModel):
    admin_secret: str
    nombre: str = Field(..., max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8)


@router.post(
    "/setup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crea el primer administrador del sistema (solo funciona una vez)",
)
async def setup_admin(data: SetupAdminRequest, db: AsyncSession = Depends(get_db)):
    if data.admin_secret != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clave de administración incorrecta.")

    # Solo funciona si no existe ningún admin
    result = await db.execute(
        select(Usuario).where(Usuario.rol == RolEnum.ADMIN.value)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un administrador. Use el dashboard para crear más usuarios.",
        )

    # Verificar email único
    existing = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado.")

    admin = Usuario(
        nombre=data.nombre,
        email=data.email,
        hashed_password=hash_password(data.password),
        rol=RolEnum.ADMIN.value,
    )
    db.add(admin)
    await db.flush()
    await db.refresh(admin)

    return AuthResponse(
        token=create_access_token({"sub": admin.email}),
        refreshToken=create_refresh_token({"sub": admin.email}),
        usuario=UsuarioResponse.model_validate(admin),
    )
