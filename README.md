# SIVAPRE

**Sistema de Vigilancia y Prevención de Enfermedades**

Plataforma epidemiológica para reportar y gestionar criaderos de mosquitos (*Aedes aegypti*) en el Perú. Los ciudadanos reportan criaderos con foto y GPS desde la app Android. Los inspectores de salud los gestionan desde un dashboard web.

> **Estado actual del piloto**: el sistema opera únicamente con reportes ciudadanos de la app móvil. Las tablas de datos NOTI (casos sospechosos) y NETLAB (confirmados por laboratorio) existen en la base de datos pero la integración con esos sistemas externos del MINSA no está implementada — los datos tendrían que cargarse manualmente.

---

## Componentes

| Componente | Tecnología | Descripción |
|---|---|---|
| **App móvil** | React Native + Expo SDK 54 | Android — ciudadanos reportan criaderos offline-first |
| **Backend (API)** | FastAPI + PostgreSQL + PostGIS | Servidor central, almacenamiento, autenticación |
| **Dashboard web** | React + Vite + Leaflet | Inspectores — mapa, KPIs, gestión de reportes |
| **Infraestructura** | Docker Compose + nginx | Un VPS, todo en puerto 80 |

---

## Inicio rápido — desarrollo local

### Requisitos

- Docker y Docker Compose
- Node.js 20+
- EAS CLI: `npm install -g eas-cli`

### 1 — Backend

```bash
cd backend
cp .env.example .env   # completar con tus credenciales
cd ..
docker compose up -d
docker exec sivapre_backend alembic upgrade head
```

### 2 — Crear el primer administrador

```bash
curl -X POST http://localhost:8000/api/v1/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "admin_secret": "TU_ADMIN_SECRET_KEY",
    "nombre": "Admin SIVAPRE",
    "email": "admin@sivapre.gob.pe",
    "password": "contraseña-segura"
  }'
```

### 3 — Dashboard

```bash
cd dashboard
npm install
npm run dev   # http://localhost:3000
```

### 4 — App móvil (Expo Go)

```bash
cd mobile
npm install
npx expo start
```

---

## Estructura del repositorio

```
sivapre/
├── backend/           # API FastAPI + modelos + migraciones
├── mobile/            # App React Native (Expo SDK 54)
├── dashboard/         # Panel web React + Vite
├── docs/              # Documentación completa
└── docker-compose.yml # Orquestación de todos los servicios
```

---

## Documentación

Ver la carpeta [`docs/`](./docs/) para la documentación completa del sistema.

---

## Producción

| Servicio | URL |
|---|---|
| Dashboard | http://161.132.53.226 |
| API | http://161.132.53.226/api/v1 |
