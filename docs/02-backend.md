# Backend — Ampara

API REST construida con FastAPI (Python 3.11). Recibe denuncias de la app móvil, gestiona la mensajería entre usuaria y operador, procesa alertas SOS y sirve datos al dashboard.

---

## Índice

1. [Estructura de carpetas](#1-estructura-de-carpetas)
2. [Variables de entorno](#2-variables-de-entorno)
3. [Base de datos — tablas](#3-base-de-datos--tablas)
4. [API — endpoints completos](#4-api--endpoints-completos)
5. [Autenticación](#5-autenticación)
6. [Autenticación anónima](#6-autenticación-anónima)
7. [Seguridad](#7-seguridad)
8. [Almacenamiento de evidencia](#8-almacenamiento-de-evidencia)
9. [Alerta SOS](#9-alerta-sos)
10. [Migraciones de base de datos](#10-migraciones-de-base-de-datos)
11. [Comandos útiles](#11-comandos-útiles)

---

## 1. Estructura de carpetas

```
backend/
├── app/
│   ├── main.py              # FastAPI, CORS, rate limiter, archivos estáticos, health check
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py  # Registra todos los routers en /api/v1
│   │       └── routes/
│   │           ├── auth.py         # Login, registro, perfil, refresh token
│   │           ├── usuarios.py     # Perfil, cambio de contraseña, círculo de confianza
│   │           ├── denuncias.py    # CRUD denuncias + evidencia + mensajes
│   │           ├── dashboard.py    # KPIs, mapa, expedientes, mensajes, personal, SOS
│   │           ├── sos.py          # Activar/cancelar/resolver alertas SOS
│   │           ├── circulo.py      # Gestión del círculo de confianza
│   │           └── servicios.py    # Comisarías y CEMs cercanos (PostGIS)
│   ├── core/
│   │   ├── config.py        # Pydantic Settings — lee y valida variables de entorno
│   │   ├── database.py      # Pool async PostgreSQL (pool_size=10, max_overflow=20)
│   │   ├── limiter.py       # Rate limiter global (SlowAPI + Redis)
│   │   └── security.py      # JWT access/refresh, bcrypt, get_current_user, get_optional_user
│   ├── models/              # SQLAlchemy ORM
│   │   ├── usuario.py
│   │   ├── denuncia.py      # Incluye calcular_nivel_riesgo() y columna PostGIS
│   │   ├── mensaje_caso.py
│   │   ├── alerta_sos.py
│   │   ├── circulo_confianza.py
│   │   └── audit_log.py
│   ├── schemas/             # Pydantic — validan entrada y serializan salida
│   │   ├── auth.py
│   │   ├── denuncia.py
│   │   ├── sos.py
│   │   ├── enums.py         # Todos los enums del dominio
│   │   └── responses.py     # ApiResponse[T], PaginatedData
│   └── services/
│       ├── sms.py           # Envío de SMS al círculo de confianza (SOS)
│       └── storage/
│           ├── base.py            # Interfaz abstracta StorageBackend
│           ├── local_storage.py   # Guarda en disco, comprime con Pillow a WebP
│           └── __init__.py        # Elige backend según STORAGE_BACKEND en .env
├── alembic/
│   ├── env.py
│   └── versions/            # Una migración por cambio de esquema
├── Dockerfile
├── requirements.txt
└── .env                     # No subir a Git
```

---

## 2. Variables de entorno

El archivo `backend/.env` contiene toda la configuración. Nunca debe subirse a Git.

```env
# ── Entorno ───────────────────────────���────────────────────────
APP_ENV=production
DEBUG=False           # False oculta /docs, /redoc y /openapi.json

# ── PostgreSQL ─────────────────────────────────────────────────
POSTGRES_USER=ampara
POSTGRES_PASSWORD=<contraseña-segura>
POSTGRES_DB=ampara_db
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://ampara:<pass>@db:5432/ampara_db

# ── Redis ───────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── JWT ─────────────────────────────────────────────────────────
JWT_SECRET_KEY=<cadena-hex-de-64-caracteres>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# ── Almacenamiento de evidencia ─────────────────────────────────
STORAGE_BACKEND=local
UPLOAD_DIR=/app/uploads
MEDIA_BASE_URL=http://161.132.53.226

# ── CORS ────────────────────────────────────────────────────────
ALLOWED_ORIGINS=["http://161.132.53.226"]

# ── Primer administrador ────────────────────────────────────────
ADMIN_SECRET_KEY=<clave-para-crear-primer-admin>

# ── SMS (para alertas SOS) ──────────────────────────────────────
SMS_PROVIDER=twilio          # o el proveedor configurado
SMS_API_KEY=<clave>
SMS_FROM=<número-origen>
```

### Cómo generar claves seguras

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"   # JWT_SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"  # ADMIN_SECRET_KEY
```

---

## 3. Base de datos — tablas

### `usuarios`

Almacena usuarias, operadores y admins.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `nombre` | VARCHAR(150) | |
| `apellido` | VARCHAR(100) | Opcional |
| `email` | VARCHAR(255) | Único, usado para login |
| `telefono` | VARCHAR(20) | Opcional |
| `rol` | VARCHAR(50) | `usuario`, `operador` o `admin` |
| `hashed_password` | VARCHAR(255) | Bcrypt — nunca texto plano |
| `push_token` | VARCHAR(200) | Expo Push Token (para notificaciones) |
| `es_activo` | BOOLEAN | Los admins pueden desactivarlo |
| `fecha_registro` | TIMESTAMPTZ | |
| `ultimo_acceso` | TIMESTAMPTZ | Se actualiza en cada login |

### `denuncias`

Cada fila es una denuncia de VG. Puede ser anónima o de una usuaria con cuenta.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `usuario_id` | UUID FK | Nullable — nulo si es anónima |
| `token_anonimo` | VARCHAR(20) | Identificador único en BD (generado en backend), siempre presente |
| `codigo_acceso` | VARCHAR(6) | Código corto amigable para seguimiento anónimo (ej. `AB3K7P`) |
| `device_id` | VARCHAR(64) | UUID del dispositivo — aislamiento entre usuarias anónimas |
| `local_id` | VARCHAR(64) | UUID generado en el celular — idempotencia offline |
| `tipo_violencia` | VARCHAR(50) | Valor principal (compat. v1) |
| `tipos_violencia` | TEXT | JSON array — múltiples tipos seleccionados |
| `relacion_agresor` | VARCHAR(50) | Relación con la persona agresora |
| `factores_riesgo` | TEXT | JSON array de factores de riesgo |
| `nivel_riesgo` | VARCHAR(20) | `urgente` / `alto` / `medio` / `bajo` — calculado automáticamente |
| `hay_heridos` | BOOLEAN | |
| `descripcion` | TEXT | Narración libre (opcional) |
| `foto_url` | VARCHAR(500) | URL pública de la foto comprimida en WebP |
| `audio_url` | VARCHAR(500) | URL pública del audio |
| `latitud` / `longitud` | FLOAT | GPS de la denuncia |
| `ubicacion` | GEOMETRY(Point, 4326) | Columna PostGIS para consultas espaciales |
| `preferencia_contacto` | VARCHAR(20) | `app` / `llamada` / `ninguno` |
| `es_anonima` | BOOLEAN | |
| `estado` | VARCHAR(50) | Ver máquina de estados abajo |
| `operador_id` | UUID FK | Nullable — operador asignado |
| `motivo_cierre` | VARCHAR(500) | Por qué se cerró el caso |
| `fecha_denuncia` | TIMESTAMPTZ | |
| `fecha_actualizacion` | TIMESTAMPTZ | |

**Máquina de estados de la denuncia:**
```
nueva → asignada → en_seguimiento → derivada → pendiente_confirmacion → cerrada
```
Cualquier estado puede pasar directamente a `cerrada`.

**Cálculo automático de `nivel_riesgo`** (función `calcular_nivel_riesgo()`):
- `urgente`: hay heridos, o factores `amenazas_muerte` / `acceso_armas`
- `alto`: relación de pareja/cónyuge, o factores `convive` / `violencia_escalando`
- `medio`: factores `seguimiento_vigilancia` / `orden_alejamiento_violada`
- `bajo`: ninguno de los anteriores

### `mensajes_caso`

Canal de mensajería entre usuaria y operador dentro de un caso.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | |
| `denuncia_id` | UUID FK | |
| `autor` | VARCHAR(20) | `operador` / `usuaria` / `sistema` |
| `contenido` | TEXT | Texto del mensaje |
| `created_at` | TIMESTAMPTZ | |

Los mensajes de tipo `sistema` los genera automáticamente el backend al cambiar el estado del caso.

### `alertas_sos`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | |
| `usuario_id` | UUID FK | Nullable — puede ser anónima |
| `denuncia_id` | UUID FK | Nullable — si ya había un caso activo; si no, se crea uno automáticamente |
| `device_id` | VARCHAR(64) | Para autenticación anónima al cancelar |
| `latitud` / `longitud` | FLOAT | Posición GPS al activar |
| `estado` | VARCHAR(20) | `activa` / `en_atencion` / `resuelta` / `cancelada` |
| `sms_enviados` | INTEGER | Cuántos SMS llegaron al círculo de confianza |
| `fecha_activacion` | TIMESTAMPTZ | |
| `fecha_resolucion` | TIMESTAMPTZ | |

### `circulo_confianza`

Contactos de emergencia de la usuaria. Reciben SMS cuando activa el SOS.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | |
| `usuario_id` | UUID FK | |
| `nombre` | VARCHAR(100) | |
| `telefono` | VARCHAR(20) | |

---

## 4. API — endpoints completos

Base URL: `http://161.132.53.226/api/v1`

Swagger solo disponible en desarrollo: `http://localhost:8000/docs`

### Autenticación — `/auth`

| Método | Ruta | Requiere | Descripción |
|---|---|---|---|
| POST | `/auth/setup` | — | Crear primer administrador (solo funciona una vez) |
| POST | `/auth/register` | — | Registrar nueva usuaria |
| POST | `/auth/login` | — | Login → devuelve `token` y `refreshToken` |
| POST | `/auth/refresh` | — | Renovar access token |
| POST | `/auth/logout` | JWT | Cerrar sesión |

### Usuaria — `/usuarios`

| Método | Ruta | Requiere | Descripción |
|---|---|---|---|
| GET | `/usuarios/me` | JWT | Ver perfil propio |
| PATCH | `/usuarios/me` | JWT | Actualizar nombre, teléfono, preferencias |
| POST | `/usuarios/me/password` | JWT | Cambiar contraseña |
| GET | `/usuarios/me/circulo` | JWT | Listar círculo de confianza |
| POST | `/usuarios/me/circulo` | JWT | Agregar contacto al círculo (máx. 4) |
| DELETE | `/usuarios/me/circulo/{id}` | JWT | Eliminar contacto del círculo |

### Denuncias — `/denuncias`

| Método | Ruta | Requiere | Descripción |
|---|---|---|---|
| POST | `/denuncias` | Opcional | Crear denuncia (JWT o `X-Device-Id` header) |
| GET | `/denuncias/mis-denuncias` | Opcional | Listar propias (JWT o `X-Device-Id`) |
| GET | `/denuncias/{id}` | Opcional | Ver detalle |
| POST | `/denuncias/{id}/foto` | Opcional | Subir/reemplazar foto |
| POST | `/denuncias/{id}/audio` | Opcional | Subir audio |
| GET | `/denuncias/{id}/mensajes` | Opcional | Ver mensajes del caso |
| POST | `/denuncias/{id}/mensajes` | Opcional | Enviar mensaje al operador |

**Idempotencia offline:** si se envía la misma combinación `(device_id, local_id)`, el backend devuelve la denuncia existente sin crear duplicado.

### Alertas SOS — `/sos`

| Método | Ruta | Requiere | Descripción |
|---|---|---|---|
| POST | `/sos` | Opcional | Activar alerta SOS + crear denuncia auto si no hay una vinculada |
| GET | `/sos/mis-alertas` | Opcional | Listar propias (JWT o `X-Device-Id`) |
| PATCH | `/sos/{id}/resolver` | Opcional | Cancelar alerta (JWT o `X-Device-Id`) |

**Comportamiento al cancelar SOS:** si la denuncia vinculada sigue en estado `nueva` (nadie la ha atendido), se cierra automáticamente.

### Dashboard — `/dashboard`

Todos requieren rol `operador` o `admin`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/dashboard/kpis` | KPIs: total casos, urgentes, sin asignar, activos |
| GET | `/dashboard/denuncias` | Expedientes paginados. Params: `solo_activas`, `estado`, `operador_id`, etc. |
| GET | `/dashboard/mapa` | Puntos GPS de denuncias (máx. 500) |
| PATCH | `/dashboard/denuncias/{id}/estado` | Cambiar estado del caso |
| PATCH | `/dashboard/denuncias/{id}/asignar` | Asignar operador |
| GET | `/dashboard/denuncias/{id}/mensajes` | Ver mensajes del caso |
| POST | `/dashboard/denuncias/{id}/mensajes` | Enviar mensaje a la usuaria |
| GET | `/dashboard/sos` | Alertas SOS activas (`activa` / `en_atencion`) |
| PATCH | `/dashboard/sos/{id}/en-atencion` | Marcar SOS como atendida |
| PATCH | `/dashboard/sos/{id}/resolver` | Resolver SOS desde el dashboard |
| GET | `/dashboard/personal` | Listar personal (solo admin) |
| POST | `/dashboard/personal` | Crear operador o admin (solo admin) |
| PATCH | `/dashboard/personal/{id}/estado` | Activar/desactivar cuenta |

**Scope de operador:** los operadores solo ven las denuncias donde `(operador_id == yo) OR (estado == "nueva")`.

### Círculo de confianza — `/circulo`

| Método | Ruta | Requiere | Descripción |
|---|---|---|---|
| GET | `/circulo` | JWT | Ver círculo propio |
| POST | `/circulo` | JWT | Agregar contacto |
| DELETE | `/circulo/{id}` | JWT | Eliminar contacto |

### Servicios cercanos — `/servicios`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/servicios/cercanos?lat=X&lon=Y` | Comisarías y CEMs más cercanos usando PostGIS |

---

## 5. Autenticación

### Dos tipos de token JWT

| Token | Duración | Uso |
|---|---|---|
| `access_token` | 30 minutos | Header `Authorization: Bearer ...` en cada petición |
| `refresh_token` | 30 días | Solo en `POST /auth/refresh` |

Cada token lleva el claim `"type": "access"` o `"type": "refresh"`. El endpoint `/auth/refresh` rechaza tokens de tipo `access`, evitando que un access token interceptado sirva para obtener nuevos tokens.

### Flujo de sesión

```
Login → access_token (30 min) + refresh_token (30 días)

Access token expirado:
  request → 401
  POST /auth/refresh con refresh_token
  → nuevo par de tokens
  reintento automático (invisible para la usuaria)

Refresh token expirado (>30 días sin usar):
  POST /auth/refresh → 401
  → logout automático → pantalla de login
```

---

## 6. Autenticación anónima

Varios endpoints aceptan dos formas de autenticación: JWT (usuaria con cuenta) o `X-Device-Id` header (usuaria anónima). La función `get_optional_user` en `security.py` resuelve la identidad en este orden:

1. Si hay header `Authorization: Bearer <token>` → verifica JWT, devuelve `Usuario`
2. Si hay header `X-Device-Id: <uuid>` → filtra por device_id, devuelve `None` (pero el endpoint usa el device_id directamente)
3. Si no hay ninguno → comportamiento según el endpoint (algunos devuelven 401, otros vacío)

Endpoints afectados: `POST /denuncias`, `GET /denuncias/mis-denuncias`, `GET /sos/mis-alertas`, `PATCH /sos/{id}/resolver`.

---

## 7. Seguridad

### Rate limiting (SlowAPI + Redis)

| Endpoint | Límite |
|---|---|
| `POST /auth/login` | 10 intentos/min por IP |
| `POST /auth/register` | 5 registros/min por IP |
| `POST /sos` | 10/min por IP |

Si Redis no está disponible, el rate limiter falla en modo abierto (los requests pasan) para no bloquear el servicio.

### CORS

```
ALLOWED_ORIGINS=["http://161.132.53.226"]
allow_credentials=False   # tokens van en header, no en cookies
```

### Contraseñas

Hasheadas con **bcrypt**. El backend nunca almacena ni puede recuperar texto plano.

### Validación de evidencia (fotos y audio)

Antes de guardar:
1. Verificación del tipo MIME real (no solo extensión)
2. Tamaño máximo 10 MB
3. Fotos reprocesadas con Pillow — elimina EXIF y posibles payloads

### Swagger UI

Deshabilitado en producción (`DEBUG=False`). Los endpoints `/docs`, `/redoc` y `/openapi.json` no responden.

---

## 8. Almacenamiento de evidencia

### Flujo de foto

```
App → POST /denuncias/{id}/foto (multipart, hasta 10 MB)
  ↓
Pillow:
  1. Valida MIME
  2. Redimensiona a máx. 1200px (proporcional)
  3. Convierte a WebP con calidad 75
  4. Elimina metadata EXIF
  5. Guarda en /app/uploads/YYYY/MM/DD/<uuid>.webp
  ↓
Respuesta: { "foto_url": "http://161.132.53.226/uploads/..." }
```

Una foto típica de celular (~4 MB JPEG) queda en ~200-400 KB WebP.

### Migración futura a MinIO/S3

`services/storage/` usa una interfaz abstracta `StorageBackend`. Para migrar:
1. Implementar `MinioStorageBackend` con la misma interfaz
2. Cambiar `STORAGE_BACKEND=minio` en `.env`
3. Reiniciar el backend

---

## 9. Alerta SOS

Cuando la usuaria activa el SOS desde la app:

1. `POST /sos` recibe `{ latitud, longitud, device_id, denuncia_id? }`
2. Si no hay `denuncia_id`, el backend crea automáticamente una denuncia mínima:
   - `nivel_riesgo = "urgente"`, `estado = "nueva"`, `tipo_violencia = "Otra"`
   - `descripcion = "Caso generado automáticamente al activar alerta SOS."`
   - Vincula la alerta a esa denuncia nueva
3. Lee el círculo de confianza de la usuaria y envía SMS a cada contacto con la ubicación
4. Devuelve `{ id, estado: "activa", sms_enviados, denuncia_id }`

Cuando la usuaria cancela el SOS:
- `PATCH /sos/{id}/resolver` con JWT o `X-Device-Id`
- Pone `alerta.estado = "cancelada"`
- Si la denuncia vinculada sigue en `estado = "nueva"`, también la cierra

Cuando el operador resuelve desde el dashboard:
- `PATCH /dashboard/sos/{id}/resolver`
- Pone `alerta.estado = "resuelta"`
- Si la denuncia vinculada sigue en `estado = "nueva"`, también la cierra

---

## 10. Migraciones de base de datos

Las migraciones se aplican automáticamente al arrancar el contenedor. Para ejecutarlas manualmente:

```bash
docker exec ampara_backend alembic upgrade head
```

### Crear una nueva migración

```bash
# 1. Modifica el modelo en app/models/
# 2. Genera la migración
docker exec ampara_backend alembic revision --autogenerate -m "descripcion"
# 3. Revisa el archivo en alembic/versions/ antes de aplicar
# 4. Aplica
docker exec ampara_backend alembic upgrade head
```

### Historial

| Fecha | Cambio |
|---|---|
| 2026-06-04 | Esquema inicial Ampara: usuarios, denuncias, mensajes_caso, audit_log |
| 2026-06-04 | Campos v2: tipos_violencia (JSON array), factores_riesgo, audio_url |
| 2026-06-04 | Tablas alertas_sos y circulo_confianza |

---

## 11. Comandos útiles

```bash
# Ver logs del backend en tiempo real
docker logs ampara_backend -f

# Acceder a la terminal del backend
docker exec -it ampara_backend bash

# Acceder a PostgreSQL
docker exec -it ampara_db psql -U ampara -d ampara_db

# Ver las denuncias más recientes
SELECT id, estado, nivel_riesgo, es_anonima, fecha_denuncia
FROM denuncias ORDER BY fecha_denuncia DESC LIMIT 10;

# Ver alertas SOS activas
SELECT id, estado, sms_enviados, fecha_activacion
FROM alertas_sos WHERE estado IN ('activa', 'en_atencion');

# Contar denuncias por estado
SELECT estado, COUNT(*) FROM denuncias GROUP BY estado ORDER BY count DESC;

# Backup manual
docker exec ampara_db pg_dump -U ampara ampara_db > backup_$(date +%Y%m%d_%H%M).sql
```
