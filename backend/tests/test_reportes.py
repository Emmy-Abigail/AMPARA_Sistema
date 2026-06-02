"""Tests de denuncias: creación, idempotencia, acceso anónimo, validaciones."""

import uuid

from httpx import AsyncClient
from tests.conftest import _unique_email, _headers

_PAYLOAD_BASE = {
    "tipo_violencia":       "Física",
    "relacion_agresor":     "Cónyuge",
    "hay_heridos":          False,
    "preferencia_contacto": "app",
    "device_id":            str(uuid.uuid4()),
    "local_id":             str(uuid.uuid4()),
    "token_anonimo":        "AMP-TEST-0001",
}


async def test_crear_denuncia(client: AsyncClient):
    h = await _headers(client)
    r = await client.post("/api/v1/denuncias/", json=_PAYLOAD_BASE, headers=h)
    assert r.status_code == 201
    body = r.json()
    assert body["data"]["tipo_violencia"] == "Física"
    assert body["data"]["nivel_riesgo"] in ("urgente", "alto", "moderado")
    assert "token_anonimo" in body["data"]


async def test_crear_denuncia_anonima(client: AsyncClient):
    """Una denuncia puede crearse sin token de autenticación."""
    payload = {**_PAYLOAD_BASE, "device_id": str(uuid.uuid4()), "local_id": str(uuid.uuid4()), "token_anonimo": "AMP-ANON-0001"}
    r = await client.post("/api/v1/denuncias/", json=payload)
    assert r.status_code == 201
    assert r.json()["data"]["es_anonima"] is True


async def test_idempotencia_denuncia(client: AsyncClient):
    """Dos envíos con el mismo (device_id, local_id) devuelven la misma denuncia."""
    h       = await _headers(client)
    payload = {**_PAYLOAD_BASE, "device_id": str(uuid.uuid4()), "local_id": str(uuid.uuid4()), "token_anonimo": "AMP-IDEM-0001"}
    r1 = await client.post("/api/v1/denuncias/", json=payload, headers=h)
    r2 = await client.post("/api/v1/denuncias/", json=payload, headers=h)
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["data"]["id"] == r2.json()["data"]["id"]


async def test_obtener_denuncia_por_token(client: AsyncClient):
    """Cualquiera puede consultar el estado de una denuncia por su token."""
    token   = f"AMP-TOK-{uuid.uuid4().hex[:4].upper()}"
    payload = {**_PAYLOAD_BASE, "device_id": str(uuid.uuid4()), "local_id": str(uuid.uuid4()), "token_anonimo": token}
    await client.post("/api/v1/denuncias/", json=payload)
    r = await client.get(f"/api/v1/denuncias/token/{token}")
    assert r.status_code == 200
    assert r.json()["data"]["token_anonimo"] == token


async def test_mis_denuncias_paginado(client: AsyncClient):
    h = await _headers(client)
    for i in range(3):
        p = {**_PAYLOAD_BASE, "device_id": str(uuid.uuid4()), "local_id": str(uuid.uuid4()), "token_anonimo": f"AMP-PAG-{i:04d}"}
        await client.post("/api/v1/denuncias/", json=p, headers=h)

    r = await client.get("/api/v1/denuncias/mis-denuncias?pagina=1&porPagina=2", headers=h)
    assert r.status_code == 200
    body = r.json()["data"]
    assert len(body["data"]) <= 2
    assert body["total"] >= 3


async def test_nivel_riesgo_urgente_cuando_hay_heridos(client: AsyncClient):
    """hay_heridos=True siempre resulta en nivel_riesgo=urgente."""
    h = await _headers(client)
    payload = {**_PAYLOAD_BASE, "hay_heridos": True, "device_id": str(uuid.uuid4()), "local_id": str(uuid.uuid4()), "token_anonimo": "AMP-HERI-0001"}
    r = await client.post("/api/v1/denuncias/", json=payload, headers=h)
    assert r.status_code == 201
    assert r.json()["data"]["nivel_riesgo"] == "urgente"


async def test_nivel_riesgo_alto_conyuge(client: AsyncClient):
    """Cónyuge sin heridos → nivel_riesgo=alto."""
    h = await _headers(client)
    payload = {**_PAYLOAD_BASE, "relacion_agresor": "Cónyuge", "hay_heridos": False, "device_id": str(uuid.uuid4()), "local_id": str(uuid.uuid4()), "token_anonimo": "AMP-ALTO-0001"}
    r = await client.post("/api/v1/denuncias/", json=payload, headers=h)
    assert r.status_code == 201
    assert r.json()["data"]["nivel_riesgo"] == "alto"


async def test_tipo_violencia_invalido(client: AsyncClient):
    h = await _headers(client)
    r = await client.post("/api/v1/denuncias/", json={
        **_PAYLOAD_BASE,
        "tipo_violencia": "TipoInexistente",
        "device_id": str(uuid.uuid4()),
        "local_id":  str(uuid.uuid4()),
    }, headers=h)
    assert r.status_code == 422
