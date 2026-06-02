"""Tests de reportes: creación, idempotencia, reportes huérfanos, validaciones."""

import uuid
import pytest
from httpx import AsyncClient
from tests.conftest import _unique_email, _headers, _headers_admin

_PAYLOAD_BASE = {
    "latitud": -3.7437,
    "longitud": -73.2516,
    "tipo_lugar": "Vivienda",
    "tipo_objeto": "Baldes",
    "observa_larvas": "Sí, claramente",
}


async def test_crear_reporte(client: AsyncClient):
    h = await _headers(client)
    r = await client.post("/api/v1/reportes", json=_PAYLOAD_BASE, headers=h)
    assert r.status_code == 201
    body = r.json()["data"]
    assert body["tipo_lugar"] == "Vivienda"
    assert body["estado"] == "enviado"


async def test_idempotencia_mismo_device_local_id(client: AsyncClient):
    """Dos envíos con el mismo (device_id, local_id) devuelven el mismo reporte."""
    h = await _headers(client)
    payload = {
        **_PAYLOAD_BASE,
        "device_id": str(uuid.uuid4()),
        "local_id": str(uuid.uuid4()),
    }
    r1 = await client.post("/api/v1/reportes", json=payload, headers=h)
    r2 = await client.post("/api/v1/reportes", json=payload, headers=h)

    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["data"]["id"] == r2.json()["data"]["id"]


async def test_reporte_huerfano_no_crashea(client: AsyncClient):
    """GET /reportes/{id} retorna 200 con usuario_id=null, no 500.

    Regresión: este endpoint devolvía 500 porque ReporteResponse.usuario_id
    era uuid.UUID (no-nullable) pero la BD permite NULL.
    """
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(
        "postgresql+asyncpg://sivapre:sivapre_secret@db:5432/sivapre_db"
    )
    async with engine.connect() as conn:
        row = (await conn.execute(
            text("SELECT id FROM reportes_app WHERE usuario_id IS NULL LIMIT 1")
        )).fetchone()
    await engine.dispose()

    if row is None:
        pytest.skip("No hay reportes huérfanos en la BD")

    h = await _headers_admin(client)
    r = await client.get(f"/api/v1/reportes/{row[0]}", headers=h)
    assert r.status_code == 200
    assert r.json()["data"]["usuario_id"] is None


async def test_comentarios_max_length(client: AsyncClient):
    """Comentarios de más de 1000 caracteres son rechazados con 422."""
    h = await _headers(client)
    r = await client.post("/api/v1/reportes", json={**_PAYLOAD_BASE, "comentarios": "x" * 1001}, headers=h)
    assert r.status_code == 422


async def test_mis_reportes_paginado(client: AsyncClient):
    h = await _headers(client)
    for _ in range(3):
        await client.post("/api/v1/reportes", json=_PAYLOAD_BASE, headers=h)

    r = await client.get("/api/v1/reportes/mis-reportes?pagina=1&porPagina=2", headers=h)
    assert r.status_code == 200
    body = r.json()["data"]
    assert body["total"] >= 3
    assert len(body["data"]) <= 2


async def test_coordenadas_invalidas(client: AsyncClient):
    h = await _headers(client)
    r = await client.post("/api/v1/reportes", json={
        **_PAYLOAD_BASE,
        "latitud": 999,
        "longitud": 999,
    }, headers=h)
    assert r.status_code == 422
