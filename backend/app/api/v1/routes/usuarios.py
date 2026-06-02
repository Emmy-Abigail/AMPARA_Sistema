from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from pydantic import BaseModel
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
from app.schemas.responses import ApiResponse
from app.schemas.usuario import (
    AuthResponse,
    CambiarPasswordRequest,
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
)

router = APIRouter(tags=["Auth"])


# ─── Registro ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado")

    user = Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        email=data.email,
        telefono=data.telefono,
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
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.es_activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")

    user.ultimo_acceso = datetime.now(timezone.utc)

    return AuthResponse(
        token=create_access_token({"sub": user.email}),
        refreshToken=create_refresh_token({"sub": user.email}),
        usuario=UsuarioResponse.model_validate(user),
    )


# ─── Refresh token ────────────────────────────────────────────────────────────

class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de refresco inválido o expirado")
    try:
        payload = jwt.decode(data.refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise exc
        email: str | None = payload.get("sub")
        if not email:
            raise exc
    except JWTError:
        raise exc

    result = await db.execute(select(Usuario).where(Usuario.email == email))
    user = result.scalar_one_or_none()
    if not user or not user.es_activo:
        raise exc

    return AuthResponse(
        token=create_access_token({"sub": user.email}),
        refreshToken=create_refresh_token({"sub": user.email}),
        usuario=UsuarioResponse.model_validate(user),
    )


# ─── Logout ───────────────────────────────────────────────────────────────────

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(_: Usuario = Depends(get_current_user)):
    # Stateless JWT — no hay blacklist en esta versión.
    # El cliente elimina los tokens del dispositivo (SecureStore).
    return None


# ─── Perfil propio ────────────────────────────────────────────────────────────

@router.get("/me", response_model=UsuarioResponse)
async def get_me(current: Usuario = Depends(get_current_user)):
    return UsuarioResponse.model_validate(current)


@router.patch("/perfil", response_model=ApiResponse[UsuarioResponse])
async def update_perfil(
    data: UsuarioUpdate,
    current: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(current, field, value)
    await db.flush()
    await db.refresh(current)
    return ApiResponse(data=UsuarioResponse.model_validate(current))


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    data: CambiarPasswordRequest,
    current: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.password_actual, current.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La contraseña actual no es correcta")
    current.hashed_password = hash_password(data.password_nuevo)
    await db.flush()
    return None


# ─── Push token ───────────────────────────────────────────────────────────────

class PushTokenRequest(BaseModel):
    token: str


@router.post("/push-token", status_code=status.HTTP_204_NO_CONTENT)
async def register_push_token(
    data: PushTokenRequest,
    current: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current.push_token = data.token
    await db.flush()
    return None


# ─── Setup: primer admin (requiere ADMIN_SECRET_KEY) ─────────────────────────

class AdminSetupRequest(BaseModel):
    secret_key: str
    nombre:     str
    email:      str
    password:   str


@router.post("/setup", status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def setup_admin(data: AdminSetupRequest, db: AsyncSession = Depends(get_db)):
    if data.secret_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Clave de administración incorrecta")

    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado")

    user = Usuario(
        nombre=data.nombre,
        email=data.email,
        hashed_password=hash_password(data.password),
        rol="admin",
    )
    db.add(user)
    await db.flush()
    return {"mensaje": "Admin creado correctamente", "email": user.email}
