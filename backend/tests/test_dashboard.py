"""Tests del dashboard: KPIs, listado, cambio de estado, mensajes, permisos."""

import uuid

from httpx import AsyncClient
from tests.conftest import _headers, _headers_operador

_PAYLOAD = {
    "tipo_violencia":       "Psicológica",
    "relacion_agresor":     "Expareja",
    "hay_heridos":          False,
    "preferencia_contacto": "ninguno",
    "device_id":            str(uuid.uuid4()),
    "local_id":             str(uuid.uuid4()),
    "token_anonimo":        "AMP-DASH-0001",
}


async def test_stats_requiere_operador(client: AsyncClient):
    """Un usuario sin rol operador/admin no puede acceder a los KPIs."""
    h = await _headers(client)
    r = await client.get("/api/v1/dashboard/stats", headers=h)
    assert r.status_code == 403


async def test_stats_retorna_estructura_correcta(client: AsyncClient):
    h = await _headers_operador(client)
    r = await client.get("/api/v1/dashboard/stats", headers=h)
    assert r.status_code == 200
    body = r.json()["data"]
    for key in ("total", "activas", "urgentes", "hoy", "por_estado", "por_tipo", "tendencia"):
        assert key in body, f"Falta clave '{key}' en stats"


async def test_listar_denuncias_con_filtro(client: AsyncClient):
    h_op  = await _headers_operador(client)
    h_usr = await _headers(client)
    # Crear denuncia de prueba
    p = {**_PAYLOAD, "device_id": str(uuid.uuid4()), "local_id": str(uuid.uuid4()), "token_anonimo": f"AMP-LST-{uuid.uuid4().hex[:4].upper()}"}
    await client.post("/api/v1/denuncias/", json=p, headers=h_usr)

    r = await client.get("/api/v1/dashboard/denuncias?estado=nueva", headers=h_op)
    assert r.status_code == 200
    body = r.json()["data"]
    assert "data" in body and "total" in body


async def test_cambiar_estado_denuncia(client: AsyncClient):
    h_op  = await _headers_operador(client)
    h_usr = await _headers(client)
    p = {**_PAYLOAD, "device_id": str(uuid.uuid4()), "local_id": str(uuid.uuid4()), "token_anonimo": f"AMP-EST-{uuid.uuid4().hex[:4].upper()}"}
    r_den = await client.post("/api/v1/denuncias/", json=p, headers=h_usr)
    denuncia_id = r_den.json()["data"]["id"]

    r = await client.patch(
        f"/api/v1/dashboard/denuncias/{denuncia_id}/estado",
        json={"estado": "asignada"},
        headers=h_op,
    )
    assert r.status_code == 200
    assert r.json()["data"]["estado"] == "asignada"


async def test_usuario_no_puede_cambiar_estado(client: AsyncClient):
    """Un usuario sin rol operador no puede cambiar el estado de una denuncia."""
    h_usr = await _headers(client)
    p = {**_PAYLOAD, "device_id": str(uuid.uuid4()), "local_id": str(uuid.uuid4()), "token_anonimo": f"AMP-PERM-{uuid.uuid4().hex[:4].upper()}"}
    r_den = await client.post("/api/v1/denuncias/", json=p, headers=h_usr)
    denuncia_id = r_den.json()["data"]["id"]

    r = await client.patch(
        f"/api/v1/dashboard/denuncias/{denuncia_id}/estado",
        json={"estado": "cerrada"},
        headers=h_usr,
    )
    assert r.status_code == 403


async def test_operador_envia_mensaje(client: AsyncClient):
    h_op  = await _headers_operador(client)
    h_usr = await _headers(client)
    p = {**_PAYLOAD, "device_id": str(uuid.uuid4()), "local_id": str(uuid.uuid4()), "token_anonimo": f"AMP-MSG-{uuid.uuid4().hex[:4].upper()}"}
    r_den = await client.post("/api/v1/denuncias/", json=p, headers=h_usr)
    denuncia_id = r_den.json()["data"]["id"]

    r = await client.post(
        f"/api/v1/dashboard/denuncias/{denuncia_id}/mensajes",
        json={"contenido": "Una patrulla está en camino.", "destruir_al_leer": False},
        headers=h_op,
    )
    assert r.status_code == 201
    assert r.json()["data"]["autor"] == "operador"
