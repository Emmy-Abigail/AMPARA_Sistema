# Backend — SIVAPRE

API REST construida con FastAPI (Python 3.11). Recibe reportes de la app móvil, los guarda en PostgreSQL, sirve datos al dashboard y gestiona el almacenamiento de fotos.

---

## Índice

1. [Estructura de carpetas](#1-estructura-de-carpetas)
2. [Variables de entorno](#2-variables-de-entorno)
3. [Base de datos — tablas](#3-base-de-datos--tablas)
4. [API — endpoints completos](#4-api--endpoints-completos)
5. [Autenticación y tokens JWT](#5-autenticación-y-tokens-jwt)
6. [Seguridad](#6-seguridad)
7. [Almacenamiento de fotos](#7-almacenamiento-de-fotos)
8. [Notificaciones push](#8-notificaciones-push)
9. [Migraciones de base de datos](#9-migraciones-de-base-de-datos)
10. [Comandos útiles](#10-comandos-útiles)

---

## 1. Estructura de carpetas

```
backend/
├── app/
│   ├── main.py              # Punto de entrada: FastAPI, CORS, rate limiter,
│   │                        # archivos estáticos, health check, logging
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py  # Registra los 3 routers en /api/v1
│   │       └── routes/
│   │           ├── usuarios.py   # Login, registro, perfil, push token
│   │           ├── reportes.py   # CRUD reportes + subida de fotos
│   │           └── dashboard.py  # KPIs, mapa, feed, tendencias, personal
│   ├── core/
│   │   ├── config.py        # Pydantic Settings — lee y valida las variables de entorno
│   │   ├── database.py      # Pool async PostgreSQL (pool_size=10, max_overflow=20)
│   │   ├── limiter.py       # Rate limiter global (SlowAPI + Redis)
│   │   └── security.py      # JWT access/refresh, bcrypt, get_current_user
│   ├── models/              # SQLAlchemy ORM — definen la estructura de las tablas
│   │   ├── usuario.py
│   │   ├── reporte.py       # Incluye columna GEOMETRY para PostGIS
│   │   ├── caso_noti.py
│   │   └── caso_netlab.py
│   ├── schemas/             # Pydantic — validan la entrada y serializan la salida
│   │   ├── auth.py
│   │   ├── usuario.py
│   │   ├── reporte.py       # ReporteCreate incluye device_id y local_id
│   │   ├── enums.py         # RolEnum, EstadoReporteEnum, TipoLugarEnum...
│   │   └── responses.py     # ApiResponse, PaginatedData, FotoResponse
│   └── services/
│       ├── notifications.py       # Envía push notifications vía Expo Push API
│       └── storage/
│           ├── base.py            # Interfaz abstracta StorageBackend
│           ├── local_storage.py   # Guarda en disco, comprime con Pillow a WebP
│           └── __init__.py        # Elige backend según STORAGE_BACKEND en .env
├── alembic/
│   ├── env.py
│   └── versions/            # Una migración por cambio de esquema, en orden cronológico
├── Dockerfile
├── requirements.txt
└── .env                     # Variables de entorno — no subir a Git (.gitignore)
```

---

## 2. Variables de entorno

El archivo `backend/.env` contiene toda la configuración. Nunca debe subirse a Git.

```env
# ── Entorno ────────────────────────────────────────────────────
APP_ENV=production
DEBUG=False           # False oculta /docs, /redoc y /openapi.json

# ── PostgreSQL ─────────────────────────────────────────────────
POSTGRES_USER=sivapre
POSTGRES_PASSWORD=<contraseña-segura>
POSTGRES_DB=sivapre_db
POSTGRES_HOST=db      # Nombre del servicio en docker-compose
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://sivapre:<pass>@db:5432/sivapre_db

# ── Redis ───────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── JWT ─────────────────────────────────────────────────────────
JWT_SECRET_KEY=<cadena-hex-de-64-caracteres>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# ── Almacenamiento de fotos ─────────────────────────────────────
STORAGE_BACKEND=local
UPLOAD_DIR=/app/uploads
MEDIA_BASE_URL=http://161.132.53.226   # URL base para las fotos servidas públicamente

# ── CORS ────────────────────────────────────────────────────────
ALLOWED_ORIGINS=["http://161.132.53.226"]

# ── Primer administrador ────────────────────────────────────────
ADMIN_SECRET_KEY=<clave-para-crear-primer-admin>
```

### Cómo generar claves seguras

```bash
# JWT_SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"

# ADMIN_SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Variables críticas de seguridad

| Variable | Riesgo si no se cambia |
|---|---|
| `JWT_SECRET_KEY` | Tokens se pueden forjar con la clave pública del repositorio |
| `ADMIN_SECRET_KEY` | El endpoint `/auth/setup` queda accesible con clave conocida |
| `POSTGRES_PASSWORD` | Base de datos accesible con contraseña pública |
| `MEDIA_BASE_URL` | URLs de fotos apuntan a localhost — imágenes rotas en la app |

---

## 3. Base de datos — tablas

### `usuarios`

Almacena tanto ciudadanos como inspectores y admins.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `nombre` | VARCHAR(150) | Nombre del usuario |
| `apellido` | VARCHAR(100) | Opcional |
| `email` | VARCHAR(255) | Único, usado para login |
| `telefono` | VARCHAR(20) | Opcional |
| `departamento` / `provincia` / `distrito` | VARCHAR(100) | Ubigeo registrado al crear cuenta |
| `rol` | VARCHAR(50) | `ciudadano`, `inspector` o `admin` |
| `hashed_password` | VARCHAR(255) | Contraseña hasheada con bcrypt (nunca texto plano) |
| `push_token` | VARCHAR(200) | Expo Push Token del último dispositivo registrado |
| `es_activo` | BOOLEAN | `True` por defecto. Los admins pueden desactivarlo. |
| `fecha_registro` | TIMESTAMPTZ | |
| `ultimo_acceso` | TIMESTAMPTZ | Se actualiza en cada login exitoso |

### `reportes_app`

Cada fila es un criadero reportado por un ciudadano.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `usuario_id` | UUID | FK → usuarios |
| `device_id` | VARCHAR(64) | UUID del dispositivo móvil (para idempotencia offline) |
| `local_id` | VARCHAR(64) | UUID generado en el celular antes de enviar (idempotencia) |
| `latitud` / `longitud` | FLOAT | Coordenadas GPS exactas |
| `ubicacion` | GEOMETRY(Point, 4326) | Columna PostGIS para consultas geoespaciales |
| `direccion` | VARCHAR(300) | Dirección postal (geocodificación inversa en el celular) |
| `foto_url` | VARCHAR(500) | URL pública de la foto comprimida en WebP |
| `tipo_lugar` | VARCHAR(100) | Vivienda / Vía Pública / Terreno Abandonado / Mercado / Colegio / Otro |
| `tipo_objeto` | VARCHAR(100) | Llantas / Baldes / Plantas / Botellas / Canales / Otro |
| `observa_larvas` | VARCHAR(50) | "Sí, claramente" / "No estoy seguro" / "No" |
| `conocimiento_dengue_cercano` | VARCHAR(50) | "Sí" / "No lo sé" / "No" |
| `comentarios` | TEXT | Notas adicionales del ciudadano (opcional) |
| `estado` | VARCHAR(50) | `enviado` → `en_revision` → `resuelto` / `rechazado` / `cancelado` |
| `fecha_reporte` | TIMESTAMPTZ | Cuándo llegó al servidor |
| `fecha_actualizacion` | TIMESTAMPTZ | Última modificación |

**Índices especiales:**
- `ix_reportes_device_id`: búsquedas rápidas de idempotencia.
- `uq_reportes_device_local` — UNIQUE PARTIAL `(device_id, local_id) WHERE ambos IS NOT NULL`: garantiza a nivel de base de datos que no existan dos reportes del mismo origen. Protege contra condiciones de carrera cuando el sync engine reintenta un reporte que ya llegó.

### `casos_noti` y `casos_netlab`

Tablas preparadas para datos epidemiológicos externos del MINSA:
- **NOTI**: casos sospechosos a nivel provincia.
- **NETLAB**: casos confirmados por PCR con serotipo de dengue.

> **Integración pendiente**: las tablas existen y el dashboard tiene endpoints y componentes para mostrarlas, pero la conexión con los sistemas NOTI/NETLAB del MINSA no está implementada. Los datos tendrían que cargarse manualmente hasta que se desarrolle esa integración. Cuando tengan datos, el dashboard los posiciona en el mapa usando coordenadas aproximadas del centroide de cada departamento (NOTI y NETLAB solo incluyen código UBIGEO, no GPS exacto).

### `audit_log`

Registra todas las modificaciones importantes: quién hizo qué y cuándo. Incluye el nombre del actor (`actor_nombre`).

---

## 4. API — endpoints completos

Base URL: `http://161.132.53.226/api/v1`

La documentación interactiva (Swagger) solo está disponible en desarrollo en `http://localhost:8000/docs`.

### Autenticación — `/auth`

| Método | Ruta | Rate limit | Requiere login | Descripción |
|---|---|---|---|---|
| POST | `/auth/setup` | — | No | Crear el primer administrador (solo funciona una vez) |
| POST | `/auth/register` | 5/min por IP | No | Registrar nuevo ciudadano |
| POST | `/auth/login` | 10/min por IP | No | Iniciar sesión → devuelve `token` y `refreshToken` |
| POST | `/auth/refresh` | — | No | Renovar access token usando el refresh token |
| POST | `/auth/logout` | — | Sí | Cerrar sesión |
| GET | `/auth/perfil` | — | Sí | Ver perfil propio |
| PATCH | `/auth/perfil` | — | Sí | Actualizar nombre, apellido, teléfono, ubigeo |
| POST | `/auth/perfil/password` | — | Sí | Cambiar contraseña |
| POST | `/auth/push-token` | — | Sí | Registrar Expo Push Token del dispositivo |

**Ejemplo — Login:**
```bash
curl -X POST http://161.132.53.226/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ana@email.com", "password": "micontraseña"}'
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": "uuid",
    "nombre": "Ana",
    "apellido": "Quispe",
    "email": "ana@email.com",
    "rol": "ciudadano",
    "departamento": "LORETO",
    "provincia": "MAYNAS",
    "distrito": "IQUITOS"
  }
}
```

**Ejemplo — Crear primer administrador:**
```bash
curl -X POST http://161.132.53.226/api/v1/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "admin_secret": "valor-de-ADMIN_SECRET_KEY",
    "nombre": "Administrador",
    "email": "admin@sivapre.gob.pe",
    "password": "contraseña-segura"
  }'
```

Solo funciona si no existe ningún admin en la base de datos. Después el admin puede crear otros inspectores desde el dashboard.

---

### Reportes — `/reportes`

| Método | Ruta | Requiere login | Descripción |
|---|---|---|---|
| POST | `/reportes/foto` | Sí | Subir foto (multipart/form-data) → devuelve URL pública |
| POST | `/reportes` | Sí | Crear reporte (idempotente con device_id + local_id) |
| GET | `/reportes/mis-reportes` | Sí | Listar reportes propios (paginado) |
| GET | `/reportes/alertas-zona` | Sí | Alertas de criaderos en la zona del usuario |
| GET | `/reportes/{id}` | Sí | Ver detalle de un reporte |
| PATCH | `/reportes/{id}/cancelar` | Sí | Cancelar reporte propio |
| PATCH | `/reportes/{id}/foto` | Sí | Adjuntar o reemplazar foto |

**Ejemplo — Crear reporte:**
```bash
curl -X POST http://161.132.53.226/api/v1/reportes \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitud": -12.046374,
    "longitud": -77.042793,
    "direccion": "Av. Brasil 1200, Breña",
    "tipo_lugar": "Vivienda",
    "tipo_objeto": "Baldes",
    "observa_larvas": "Sí, claramente",
    "conocimiento_dengue_cercano": "No lo sé",
    "foto_url": "http://161.132.53.226/uploads/2026/05/13/abc.webp",
    "device_id": "550e8400-e29b-41d4-a716-446655440000",
    "local_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }'
```

Si se reenvía la misma combinación `(device_id, local_id)`, el backend devuelve el reporte existente con HTTP 201 sin crear duplicado.

---

### Dashboard — `/dashboard`

Todos los endpoints requieren rol `inspector` o `admin`.

**Filtros opcionales en todos los endpoints:**

| Parámetro | Formato | Ejemplo |
|---|---|---|
| `fecha_desde` | YYYY-MM-DD | `2026-01-01` |
| `fecha_hasta` | YYYY-MM-DD | `2026-12-31` |
| `departamento` | texto | `LORETO` |
| `provincia` | texto | `MAYNAS` |
| `distrito` | texto | `IQUITOS` |

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/dashboard/kpis` | 4 métricas (total reportes, con larvas, NOTI, NETLAB) calculadas en paralelo |
| GET | `/dashboard/mapa/reportes` | Puntos GPS de reportes ciudadanos (máx. 2000) |
| GET | `/dashboard/mapa/noti` | Casos NOTI agrupados por provincia |
| GET | `/dashboard/mapa/netlab` | Casos NETLAB confirmados con serotipo |
| GET | `/dashboard/feed` | Últimos reportes con detalle completo |
| GET | `/dashboard/tendencias` | Series de tiempo semanales (últimas 12 semanas) |
| GET | `/dashboard/ubicaciones` | Lista de departamentos disponibles para el filtro |
| PATCH | `/dashboard/reportes/{id}/estado` | Cambiar estado del reporte + notificación push al ciudadano |
| GET | `/dashboard/personal` | Listar inspectores y admins (solo admin) |
| POST | `/dashboard/personal` | Crear nueva cuenta de inspector o admin (solo admin) |
| PATCH | `/dashboard/personal/{id}/estado` | Activar o desactivar una cuenta |

---

## 5. Autenticación y tokens JWT

### Dos tipos de token

| Token | Duración | Cuándo se usa |
|---|---|---|
| `access_token` | 30 minutos | En cada petición en el header `Authorization: Bearer ...` |
| `refresh_token` | 30 días | Solo en `POST /auth/refresh` para obtener un nuevo par |

Cada token lleva el claim `"type": "access"` o `"type": "refresh"`. El endpoint `/auth/refresh` rechaza tokens de tipo `access` aunque no hayan expirado, evitando que un access token interceptado pueda usarse para obtener nuevos tokens.

### Flujo de sesión

```
Login
  → access_token  (30 min)
  → refresh_token (30 días)

Uso normal:
  request con access_token → OK

Access token expirado:
  request → 401
  POST /auth/refresh con refresh_token
  → nuevo access_token + nuevo refresh_token
  reintento del request original → OK
  (el usuario no ve nada — ocurre automáticamente)

Refresh token expirado (>30 días sin usar la app):
  POST /auth/refresh → 401
  → logout automático → pantalla de login
```

### Por qué dos tokens en lugar de uno largo

Un solo token de 30 días tiene más tiempo de exposición si se filtra. Con dos tokens:
- El `access_token` dura 30 minutos — si se filtra, el daño es limitado.
- El `refresh_token` nunca viaja en peticiones normales — mucho menor exposición.

---

## 6. Seguridad

### Rate limiting (SlowAPI + Redis)

| Endpoint | Límite | Razón |
|---|---|---|
| `POST /auth/login` | 10 intentos/min por IP | Protección contra fuerza bruta |
| `POST /auth/register` | 5 registros/min por IP | Previene creación masiva de cuentas falsas |

El límite de login es 10 (no 3 o 5) porque municipios y centros de salud tienen muchos usuarios bajo la misma IP pública (NAT compartido).

Si Redis cae en producción, el rate limiter falla en modo "open" — los requests pasan sin verificación. Es mejor eso que devolver 500 a todos los usuarios mientras Docker reinicia el contenedor.

### CORS

```python
ALLOWED_ORIGINS=["http://161.132.53.226"]
allow_credentials=False   # tokens van en header, no en cookies
```

### Contraseñas

Hasheadas con **bcrypt**. El backend nunca almacena ni puede recuperar el texto plano de una contraseña.

### Validación de fotos

Antes de guardar cualquier imagen:
1. Verificación del tipo MIME real (no solo la extensión del archivo)
2. Tamaño máximo 5 MB
3. Reprocesado con Pillow — elimina metadata EXIF y posibles payloads maliciosos

### Swagger UI

Completamente deshabilitado en producción (`DEBUG=False`). Los endpoints `/docs`, `/redoc` y `/openapi.json` no responden.

### Idempotencia y condición de carrera

`POST /reportes` tiene tres capas de defensa contra duplicados:
1. **Consulta previa**: si `(device_id, local_id)` ya existe, devuelve el reporte existente.
2. **Índice UNIQUE PARTIAL** en PostgreSQL: garantiza unicidad a nivel de base de datos.
3. **Catch de IntegrityError**: si dos requests simultáneos pasan la consulta previa al mismo tiempo, el segundo recibe IntegrityError → se hace rollback y se devuelve el reporte del primero.

---

## 7. Almacenamiento de fotos

### Flujo completo

```
App → POST /reportes/foto (multipart, hasta 5 MB)
  ↓
Pillow (Python):
  1. Valida tipo MIME
  2. Redimensiona a máx. 1200px en cualquier lado (proporcional)
  3. Convierte a WebP con calidad 75
  4. Guarda en /app/uploads/YYYY/MM/DD/<uuid>.webp
  ↓
Respuesta: { "url": "http://161.132.53.226/uploads/2026/05/13/abc.webp" }
  ↓
App guarda esa URL en SQLite (foto_url)
  ↓
Sync engine incluye foto_url al crear el reporte en el servidor
```

Una foto típica de celular (~4 MB JPEG) queda en ~200-400 KB WebP.

### Servicio de fotos

nginx hace proxy de `/uploads/*` → `backend:8000`, que las sirve como archivos estáticos montados desde el volumen Docker `uploads_data`.

### ⚠️ El volumen `uploads_data` es crítico

Si se borra, todas las `foto_url` guardadas en la base de datos quedarán apuntando a archivos que ya no existen. Las fotos no son recuperables.

```bash
# Ver cuánto espacio usan las fotos
docker exec sivapre_backend du -sh /app/uploads

# NUNCA en producción:
docker compose down -v  # ← borra uploads_data y postgres_data
```

### Migración futura a MinIO o S3

`services/storage/` usa una interfaz abstracta `StorageBackend`. Para migrar:
1. Implementar `MinioStorageBackend` con la misma interfaz en `storage/minio_storage.py`
2. Cambiar `STORAGE_BACKEND=minio` en `.env`
3. Reiniciar el backend

El resto del código (endpoints, modelos, app móvil) no necesita cambios.

---

## 8. Notificaciones push

Cuando un inspector cambia el estado de un reporte desde el dashboard, el backend notifica automáticamente al ciudadano que lo creó.

### Cómo funciona

1. El ciudadano hace login en la app.
2. La app obtiene el Expo Push Token del dispositivo y lo envía a `POST /auth/push-token`.
3. El backend lo guarda en `usuarios.push_token`.
4. Al ejecutar `PATCH /dashboard/reportes/{id}/estado`, el backend lee el token del dueño del reporte.
5. Llama a `https://exp.host/push/send` con el mensaje.
6. Expo entrega la notificación al celular (funciona aunque la app esté cerrada).

### Mensajes según el estado

| Estado nuevo | Título | Mensaje |
|---|---|---|
| `en_revision` | 🔍 Reporte en revisión | Un inspector está revisando tu reporte |
| `resuelto` | ✅ Reporte resuelto | ¡Tu criadero ha sido controlado. Gracias! |
| `rechazado` | ℹ️ Reporte no procesado | No pudo ser verificado en campo |
| `cancelado` | Reporte cancelado | Tu reporte fue cancelado |

### Estado actual

Las notificaciones push en APK standalone de Android requieren **Firebase Cloud Messaging**. Actualmente no está configurado. Ver [03-app-movil.md](./03-app-movil.md) para los pasos de configuración.

---

## 9. Migraciones de base de datos

Las migraciones registran los cambios en la estructura de la base de datos. Se aplican automáticamente al iniciar el contenedor del backend.

### Aplicar migraciones manualmente

```bash
docker exec sivapre_backend alembic upgrade head
```

### Crear una nueva migración

```bash
# 1. Modifica el modelo en app/models/
# 2. Genera la migración automáticamente
docker exec sivapre_backend alembic revision --autogenerate -m "descripcion del cambio"
# 3. Revisa el archivo generado en alembic/versions/ antes de aplicar
# 4. Aplica
docker exec sivapre_backend alembic upgrade head
```

### Historial de migraciones

| Fecha | Cambio |
|---|---|
| 2026-04-15 | Esquema inicial: usuarios, reportes, casos_noti, casos_netlab |
| 2026-04-21 | Agrega `apellido` y `rol` a usuarios |
| 2026-04-21 | Amplía campos VARCHAR en reportes |
| 2026-04-21 | Default `TRUE` para `es_activo` en usuarios |
| 2026-04-28 | Agrega `departamento`, `provincia`, `distrito` a usuarios |
| 2026-04-29 | Agrega `push_token` a usuarios |
| 2026-04-29 | Agrega `device_id`, `local_id`, índice UNIQUE PARTIAL a reportes |
| 2026-04-30 | Índices adicionales y corrección de cascadas |
| 2026-05-11 | Agrega `direccion` a reportes (geocodificación inversa) |
| 2026-05-11 | Agrega `actor_nombre` al log de auditoría |
| 2026-05-12 | Tabla `audit_log` completa |

---

## 10. Comandos útiles

### Contenedores

```bash
# Ver estado de todos los contenedores
docker ps

# Ver logs del backend en tiempo real
docker logs sivapre_backend -f

# Acceder a la terminal del backend
docker exec -it sivapre_backend bash

# Reiniciar el backend (necesario después de cambiar .env)
docker restart sivapre_backend

# Detener todo SIN borrar datos
docker compose down

# Detener Y borrar volúmenes ⚠️ BORRA BD Y FOTOS
docker compose down -v
```

### Base de datos

```bash
# Abrir consola SQL de PostgreSQL
docker exec -it sivapre_db psql -U sivapre -d sivapre_db

# Ver los reportes más recientes
SELECT id, estado, tipo_lugar, fecha_reporte
FROM reportes_app
ORDER BY fecha_reporte DESC
LIMIT 10;

# Ver todos los usuarios
SELECT id, email, rol, es_activo, fecha_registro
FROM usuarios
ORDER BY fecha_registro DESC;

# Contar reportes por estado
SELECT estado, COUNT(*) FROM reportes_app GROUP BY estado;
```

### Backup manual

```bash
# Crear backup de la base de datos
docker exec sivapre_db pg_dump -U sivapre sivapre_db > backup_$(date +%Y%m%d_%H%M).sql

# Restaurar desde backup
cat backup_20260513_1200.sql | docker exec -i sivapre_db psql -U sivapre -d sivapre_db
```
