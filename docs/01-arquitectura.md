# Arquitectura General — SIVAPRE

Sistema de Vigilancia y Prevención de Enfermedades. Permite a ciudadanos reportar criaderos de mosquitos desde el celular y a inspectores de salud gestionar esos reportes desde un navegador web.

---

## Documentación completa

| Documento | Contenido |
|---|---|
| [02-backend.md](./02-backend.md) | API, base de datos, autenticación, seguridad, almacenamiento, migraciones |
| [03-app-movil.md](./03-app-movil.md) | Pantallas, navegación, arquitectura offline, sincronización, build del APK |
| [04-dashboard.md](./04-dashboard.md) | Componentes, mapa, filtros, gestión de personal |
| [05-despliegue.md](./05-despliegue.md) | Cómo actualizar el VPS, construir el APK, backups, mantenimiento |

---

## Estado actual del piloto

El sistema opera **únicamente con reportes ciudadanos** de la app móvil. Las tablas `casos_noti` y `casos_netlab` existen en la base de datos y el dashboard tiene los componentes para mostrarlas, pero **la integración con los sistemas externos del MINSA no está implementada**. Los datos de NOTI y NETLAB tendrían que cargarse manualmente hasta que se desarrolle esa integración.

---

## Actores del sistema

| Actor | Herramienta | Qué hace |
|---|---|---|
| **Ciudadano** | App móvil (Android) | Reporta criaderos con foto y GPS, ve el estado de sus reportes |
| **Inspector de salud** | Dashboard web (navegador) | Ve el mapa, gestiona estados de reportes, ve tendencias |
| **Administrador** | Dashboard web (navegador) | Todo lo del inspector + crea y gestiona cuentas de personal |

---

## Flujo de datos

```
CIUDADANO (App móvil)
    │
    │  1. Toma foto + captura GPS
    │  2. Llena el formulario
    │  3. Reporte guardado en SQLite local (siempre, con o sin señal)
    │  4. Sync engine envía al servidor cuando hay conexión
    │  5. Recibe notificación push cuando cambia el estado (*)
    ▼
NGINX — puerto 80 (único punto de entrada al VPS)
    │
    ├── /api/*      → FastAPI backend (interno: 8000)
    ├── /uploads/*  → fotos guardadas en disco
    └── /*          → Dashboard web (archivos estáticos)
    │
    ▼
FASTAPI (Python)
    ├── Guarda reporte en PostgreSQL
    ├── Comprime foto a WebP y la guarda en disco
    └── Al cambiar estado → notificación push al ciudadano (*)
    │
    ▼
POSTGRESQL + POSTGIS
    ├── usuarios, reportes, casos NOTI, casos NETLAB
    │
REDIS
    └── Rate limiting

(*) Push notifications requieren Firebase — pendiente de configurar.

INSPECTOR (Dashboard web)
    │
    ├── Ve KPIs, mapa multicapa, feed de reportes, tendencias semanales
    └── Cambia el estado de los reportes (en revisión → resuelto / rechazado)
```

---

## Infraestructura en producción

```
VPS: 161.132.53.226
│
└── docker-compose.yml
    ├── sivapre_dashboard (nginx)   → puerto 80 público
    ├── sivapre_backend  (FastAPI)  → interno, puerto 8000
    ├── sivapre_db       (PostgreSQL + PostGIS) → interno, puerto 5432
    └── sivapre_redis    (Redis)    → interno, puerto 6379
```

Todo el tráfico externo entra por el **puerto 80**. Los demás puertos son internos a la red Docker.

Los datos persisten en volúmenes Docker:
- `postgres_data` → base de datos ⚠️ no borrar
- `uploads_data` → fotos de reportes ⚠️ no borrar
- `redis_data` → contadores de rate limiting (no crítico)

---

## Stack tecnológico

| Capa | Tecnologías principales |
|---|---|
| **App móvil** | React Native, Expo SDK 54, TypeScript, expo-sqlite, expo-location |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy async, PostgreSQL 16, PostGIS, Redis |
| **Dashboard** | React 18, Vite, Tailwind CSS 4, Leaflet, Recharts, Zustand |
| **Infraestructura** | Docker Compose, nginx, EAS Build (Expo) |

---

## Roles y permisos

| Rol | Acceso |
|---|---|
| `ciudadano` | Solo sus propios reportes (app móvil) |
| `inspector` | Dashboard completo: lectura y cambio de estados |
| `admin` | Todo lo del inspector + crear y gestionar cuentas de personal |

---

## Limitaciones del piloto

| Limitación | Solución cuando escale |
|---|---|
| VPS único — sin alta disponibilidad | Segundo VPS + load balancer |
| Fotos en disco local | Migrar a MinIO / Cloudflare R2 |
| Sin backups automáticos | `pg_dump` en crontab → almacenamiento externo |
| HTTP sin HTTPS — notificaciones de escritorio bloqueadas | Dominio + Let's Encrypt |
| Push notifications no configuradas | Proyecto Firebase + `google-services.json` |
