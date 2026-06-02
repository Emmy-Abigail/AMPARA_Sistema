"""Tests de dashboard: KPIs, feed, cambio de estado, audit log, permisos."""

from httpx import AsyncClient
from tests.conftest import _unique_email, _headers, _headers_admin

_PAYLOAD = {
    "latitud": -3.7437,
    "longitud": -73.2516,
    "tipo_lugar": "Vivienda",
    "tipo_objeto": "Baldes",
    "observa_larvas": "Sí, claramente",
}


async def test_kpis_requiere_staff(client: AsyncClient):
    h = await _headers(client)
    r = await client.get("/api/v1/dashboard/kpis", headers=h)
    assert r.status_code == 403


async def test_kpis_admin(client: AsyncClient):
    h = await _headers_admin(client)
    r = await client.get("/api/v1/dashboard/kpis", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert "total_reportes" in body
    assert "reportes_con_larvas" in body


async def test_feed_retorna_lista(client: AsyncClient):
    h = await _headers_admin(client)
    r = await client.get("/api/v1/dashboard/feed", headers=h)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_feed_reporter_nombre_no_null(client: AsyncClient):
    """Regresión: el feed nunca devuelve reporter.nombre = null aunque el usuario esté eliminado."""
    h = await _headers_admin(client)
    r = await client.get("/api/v1/dashboard/feed", headers=h)
    assert r.status_code == 200
    for item in r.json():
        assert item["reporter"]["nombre"] is not None
        assert item["reporter"]["nombre"] != ""


async def test_cambio_estado_y_audit_log(client: AsyncClient):
    """Cambiar estado crea una entrada en el audit log con datos correctos."""
    h_user = await _headers(client)
    r_reporte = await client.post("/api/v1/reportes", json=_PAYLOAD, headers=h_user)
    assert r_reporte.status_code == 201
    reporte_id = r_reporte.json()["data"]["id"]

    h_admin = await _headers_admin(client)
    r_patch = await client.patch(
        f"/api/v1/dashboard/reportes/{reporte_id}/estado",
        json={"estado": "en_revision"},
        headers=h_admin,
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["estado"] == "en_revision"

    r_hist = await client.get(
        f"/api/v1/dashboard/reportes/{reporte_id}/historial",
        headers=h_admin,
    )
    assert r_hist.status_code == 200
    historial = r_hist.json()
    assert len(historial) >= 1
    ultimo = historial[-1]
    assert ultimo["estado_anterior"] == "enviado"
    assert ultimo["estado_nuevo"] == "en_revision"
    assert ultimo["actor_email"] == "admin@sivapre.gob.pe"


async def test_audit_log_multiples_cambios(client: AsyncClient):
    """Múltiples cambios de estado generan múltiples entradas en el log."""
    h_user = await _headers(client)
    r = await client.post("/api/v1/reportes", json=_PAYLOAD, headers=h_user)
    reporte_id = r.json()["data"]["id"]

    h_admin = await _headers_admin(client)
    for estado in ("en_revision", "resuelto"):
        await client.patch(
            f"/api/v1/dashboard/reportes/{reporte_id}/estado",
            json={"estado": estado},
            headers=h_admin,
        )

    r_hist = await client.get(
        f"/api/v1/dashboard/reportes/{reporte_id}/historial",
        headers=h_admin,
    )
    assert len(r_hist.json()) == 2


async def test_ciudadano_no_puede_cambiar_estado(client: AsyncClient):
    h_user = await _headers(client)
    r = await client.post("/api/v1/reportes", json=_PAYLOAD, headers=h_user)
    reporte_id = r.json()["data"]["id"]

    r_bad = await client.patch(
        f"/api/v1/dashboard/reportes/{reporte_id}/estado",
        json={"estado": "resuelto"},
        headers=h_user,
    )
    assert r_bad.status_code == 403


async def test_health_check(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["db"] == "ok"
