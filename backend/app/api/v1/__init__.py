from fastapi import APIRouter

from app.api.v1.routes import circulo, dashboard, denuncias, servicios, sos, usuarios

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(usuarios.router,  prefix="/auth")
api_router.include_router(denuncias.router, prefix="/denuncias")
api_router.include_router(dashboard.router, prefix="/dashboard")
api_router.include_router(sos.router,       prefix="/sos")
api_router.include_router(circulo.router,   prefix="/usuarios/me/circulo")
api_router.include_router(servicios.router, prefix="/servicios")
