"""Tests de autenticación: registro, login, refresh, validaciones."""

from httpx import AsyncClient
from tests.conftest import _unique_email, _crear_usuario, _headers


async def test_registro_exitoso(client: AsyncClient):
    r = await client.post("/api/v1/auth/register", json={
        "nombre": "Carmen López",
        "email": _unique_email("carmen"),
        "password": "Segura123!",
    })
    assert r.status_code == 201
    body = r.json()
    assert "token" in body
    assert body["usuario"]["rol"] == "ciudadano"


async def test_registro_email_duplicado(client: AsyncClient):
    email = _unique_email("dup")
    payload = {"nombre": "A", "email": email, "password": "Test1234!"}
    await client.post("/api/v1/auth/register", json=payload)
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 409


async def test_login_exitoso(client: AsyncClient):
    email = _unique_email("login")
    await _crear_usuario(client, email)
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": "Test1234!"})
    assert r.status_code == 200
    assert "token" in r.json()
    assert "refreshToken" in r.json()


async def test_login_credenciales_incorrectas(client: AsyncClient):
    r = await client.post("/api/v1/auth/login", json={
        "email": "noexiste@example.com",
        "password": "cualquiera",
    })
    assert r.status_code == 401


async def test_refresh_token(client: AsyncClient):
    email = _unique_email("refresh")
    await _crear_usuario(client, email)
    r_login = await client.post("/api/v1/auth/login", json={"email": email, "password": "Test1234!"})
    refresh_token = r_login.json()["refreshToken"]

    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 200
    assert "token" in r.json()


async def test_refresh_con_access_token_rechazado(client: AsyncClient):
    """Un access token NO puede usarse como refresh token."""
    email = _unique_email("refresh2")
    await _crear_usuario(client, email)
    r_login = await client.post("/api/v1/auth/login", json={"email": email, "password": "Test1234!"})
    access_token = r_login.json()["token"]

    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
    assert r.status_code == 401


async def test_endpoint_protegido_sin_token(client: AsyncClient):
    r = await client.get("/api/v1/reportes/mis-reportes")
    assert r.status_code == 403
