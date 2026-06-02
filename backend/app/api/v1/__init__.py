from fastapi import APIRouter

from app.api.v1.routes import usuarios, denuncias, dashboard

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(usuarios.router,  prefix="/auth")
api_router.include_router(denuncias.router, prefix="/denuncias")
api_router.include_router(dashboard.router, prefix="/dashboard")
