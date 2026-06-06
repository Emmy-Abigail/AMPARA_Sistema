# Arquitectura General — Ampara

Sistema de denuncias de violencia de género. Permite a cualquier persona reportar una situación de VG desde el celular —con cuenta o de forma completamente anónima— y a operadores de servicios sociales gestionar esos casos desde un navegador web.

---

## Actores del sistema

| Actor | Herramienta | Qué hace |
|---|---|---|
| **Usuaria** | App móvil (Android) | Registra denuncia (anónima o con cuenta), sube evidencia (foto/audio/GPS), sigue el estado de su caso, chatea con el operador, activa alerta SOS |
| **Operador** | Dashboard web | Ve sus casos asignados y los sin asignar, actualiza estados, envía mensajes a la usuaria, atiende alertas SOS |
| **Admin** | Dashboard web | Todo lo del operador + crea y gestiona cuentas de personal |

---

## Flujo de datos

```
USUARIA (App móvil)
    │
    │  1. Rellena formulario de denuncia (offline-first)
    │  2. Denuncia guardada en SQLite local (siempre, con o sin señal)
    │  3. Sync engine envía al servidor cuando hay conexión
    │  4. Recibe mensajes del operador en la app
    │  5. Puede activar SOS → SMS a su círculo de confianza
    ▼
NGINX — puerto 80 (único punto de entrada al VPS)
    │
    ├── /api/*      → FastAPI backend (interno: 8000)
    ├── /uploads/*  → fotos y audio guardados en disco
    └── /*          → Dashboard web (archivos estáticos)
    │
    ▼
FASTAPI (Python)
    ├── Guarda denuncia en PostgreSQL
    ├── Comprime foto a WebP, guarda audio en disco
    ├── Al cambiar estado → mensaje de sistema al caso
    └── SOS activado → envía SMS al círculo de confianza
    │
    ▼
POSTGRESQL + POSTGIS
    └── usuarios, denuncias, mensajes_caso, alertas_sos, circulo_confianza
REDIS
    └── Rate limiting

OPERADOR (Dashboard web)
    │
    ├── Ve KPIs, expedientes por pestaña, mapa de casos
    ├── Cambia el estado del caso, envía mensajes a la usuaria
    └── Atiende alertas SOS con botón "En atención" / "Resolver"
```

---

## Máquinas de estado

### Denuncia

```
nueva
  ↓  (operador asigna)
asignada
  ↓  (operador inicia seguimiento)
en_seguimiento
  ↓  (operador deriva a otra institución)
derivada          ← opcional
  ↓
pendiente_confirmacion   ← espera confirmación antes de cerrar
  ↓
cerrada
```

También puede cerrarse desde cualquier estado. Si el SOS vinculado se cancela/resuelve y la denuncia sigue en `nueva`, se cierra automáticamente.

### Alerta SOS

```
activa  →  en_atencion  →  resuelta   (operador)
activa  →                  cancelada  (usuaria desde la app)
```

---

## Modo anónimo

La app puede usarse sin crear cuenta. En ese modo:

- Se genera un `device_id` único (UUID) al instalar la app y se guarda en `AsyncStorage`.
- Cada denuncia y alerta SOS lleva ese `device_id`.
- El backend filtra los datos usando `device_id` → cada dispositivo solo ve sus propios casos.
- La usuaria recibe un `codigo_acceso` (6 caracteres, sin 0/O/1/I) para consultar su caso manualmente si cambia de dispositivo.
- El `token_anonimo` (20 chars URL-safe) sirve como identificador interno único en la base de datos.

---

## Infraestructura en producción

```
VPS: 161.132.53.226
│
└── docker-compose.yml
    ├── ampara_dashboard (nginx)          → puerto 80 público
    ├── ampara_backend   (FastAPI)        → interno, puerto 8000
    ├── ampara_db        (PostgreSQL + PostGIS) → interno, puerto 5432
    └── ampara_redis     (Redis)          → interno, puerto 6379
```

Todo el tráfico externo entra por el **puerto 80**. Los demás puertos son internos a la red Docker y no están expuestos al exterior.

Los datos persisten en volúmenes Docker:
- `postgres_data` → base de datos ⚠️ nunca borrar
- `uploads_data` → fotos y audios ⚠️ nunca borrar
- `redis_data` → contadores de rate limiting (no crítico)

---

## Stack tecnológico

| Capa | Tecnologías |
|---|---|
| **App móvil** | React Native, Expo SDK 54, TypeScript, expo-sqlite, expo-location, expo-av |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy async, Alembic, PostgreSQL 16, PostGIS, Redis |
| **Dashboard** | React 18, Vite, TypeScript, Tailwind CSS v4, Leaflet, Recharts, React Query, Zustand |
| **Infraestructura** | Docker Compose, nginx, EAS Build (Expo), Twilio/SMS para SOS |

---

## Seguridad y privacidad por diseño

| Medida | Implementación |
|---|---|
| **Modo anónimo real** | Sin cuenta, sin email, solo `device_id` — imposible vincular a persona |
| **Contraseñas** | Bcrypt — el backend nunca almacena texto plano |
| **Tokens JWT** | Access (30 min) + Refresh (30 días) con claims `type` para evitar uso cruzado |
| **Rate limiting** | SlowAPI + Redis — 10/min en login, 5/min en registro |
| **Fotos** | Validación MIME real + eliminación de EXIF + compresión a WebP con Pillow |
| **Swagger deshabilitado** | `DEBUG=False` en producción oculta `/docs` y `/openapi.json` |
| **Ícono de camuflaje** | La app puede disfrazarse de otra aplicación (calculadora, clima, etc.) |

---

## Roles y permisos

| Rol | Lo que puede ver/hacer |
|---|---|
| `usuario` | Solo sus propias denuncias y mensajes |
| `operador` | Sus casos asignados + todos los casos en estado `nueva` (sin asignar) |
| `admin` | Todos los casos + crear/gestionar cuentas de personal |

---

## Limitaciones actuales

| Limitación | Solución cuando escale |
|---|---|
| VPS único — sin alta disponibilidad | Segundo VPS + load balancer |
| Fotos/audio en disco local | Migrar a MinIO / Cloudflare R2 |
| Sin backups automáticos | `pg_dump` en crontab → almacenamiento externo |
| HTTP sin HTTPS | Dominio + Let's Encrypt (necesario para notificaciones push en prod) |
| SMS depende de proveedor externo | Implementado vía `services/sms.py` — configurable |
