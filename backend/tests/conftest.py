"""Fixtures compartidas para todos los tests.

Los tests usan el cliente HTTP de la app directamente (ASGITransport).
Cada test genera datos propios con emails y UUIDs únicos — no limpian la
BD al terminar, pero no interfieren entre sí porque los datos son aleatorios.

Para CI con una BD limpia: usar TEST_DATABASE_URL apuntando a una BD de test.
"""

import os

# Debe estar antes de cualquier import de app para que el limiter lo lea al inicializarse.
os.environ["TESTING"] = "1"

import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest_asyncio.fixture()
async def client():
    """Cliente HTTP que habla con la app FastAPI en memoria, usando la BD del .env."""
    from app.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


# ─── Helpers ──────────────────────────────────────────────────────────────────

import uuid as _uuid


def _unique_email(prefix: str = "test") -> str:
    return f"{prefix}.{_uuid.uuid4().hex[:8]}@example.com"


async def _crear_usuario(client: AsyncClient, email: str, password: str = "Test1234!") -> dict:
    r = await client.post("/api/v1/auth/register", json={
        "nombre": "Test User",
        "email": email,
        "password": password,
    })
    if r.status_code == 409:
        r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code in (200, 201), f"crear_usuario falló: {r.text}"
    return r.json()


async def _headers(client: AsyncClient, email: str | None = None, password: str = "Test1234!") -> dict:
    email = email or _unique_email()
    data = await _crear_usuario(client, email, password)
    return {"Authorization": f"Bearer {data['token']}"}


async def _headers_admin(client: AsyncClient) -> dict:
    r = await client.post("/api/v1/auth/login", json={
        "email": "admin@sivapre.gob.pe",
        "password": "Admin2024!",
    })
    assert r.status_code == 200, f"login admin falló: {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}"}
