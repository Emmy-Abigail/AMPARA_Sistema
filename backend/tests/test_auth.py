"""Tests de autenticación: registro, login, refresh, cambio de contraseña, permisos."""

from httpx import AsyncClient
from tests.conftest import _unique_email, _crear_usuario, _headers


async def test_registro_exitoso(client: AsyncClient):
    r = await client.post("/api/v1/auth/register", json={
        "nombre":   "María García",
        "email":    _unique_email("maria"),
        "password": "Segura123!",
    })
    assert r.status_code == 201
    body = r.json()
    assert "token" in body
    assert "refreshToken" in body
    assert body["usuario"]["rol"] == "usuario"


async def test_registro_email_duplicado(client: AsyncClient):
    email   = _unique_email("dup")
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
        "email":    "noexiste@example.com",
        "password": "cualquiera",
    })
    assert r.status_code == 401


async def test_refresh_token(client: AsyncClient):
    email = _unique_email("refresh")
    await _crear_usuario(client, email)
    r_login       = await client.post("/api/v1/auth/login", json={"email": email, "password": "Test1234!"})
    refresh_token = r_login.json()["refreshToken"]
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 200
    assert "token" in r.json()


async def test_refresh_con_access_token_rechazado(client: AsyncClient):
    """Un access token NO puede usarse como refresh token."""
    email = _unique_email("refresh2")
    await _crear_usuario(client, email)
    r_login      = await client.post("/api/v1/auth/login", json={"email": email, "password": "Test1234!"})
    access_token = r_login.json()["token"]
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
    assert r.status_code == 401


async def test_endpoint_protegido_sin_token(client: AsyncClient):
    """Endpoints que requieren autenticación devuelven 403 sin token."""
    r = await client.get("/api/v1/dashboard/stats")
    assert r.status_code == 403


async def test_perfil_actualizado(client: AsyncClient):
    h = await _headers(client)
    r = await client.patch("/api/v1/auth/perfil", json={"telefono": "+51999888777"}, headers=h)
    assert r.status_code == 200
    assert r.json()["data"]["telefono"] == "+51999888777"
