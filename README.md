# Ampara

**Plataforma de denuncias de violencia de género**

Ampara permite a cualquier persona reportar situaciones de violencia de género desde su celular — de forma anónima o con cuenta — y a operadores de salud o servicios sociales gestionar esos casos desde un panel web.

---

## Componentes

| Componente | Tecnología | Descripción |
|---|---|---|
| **App móvil** | React Native + Expo SDK 54 | Android — ciudadanos reportan VG con foto, audio y GPS, offline-first |
| **Backend (API)** | FastAPI + PostgreSQL + PostGIS + Redis | Servidor central, autenticación JWT, almacenamiento de evidencia, rate limiting |
| **Dashboard web** | React + Vite + Leaflet | Operadores y admin — mapa de casos, KPIs, gestión de denuncias |
| **Infraestructura** | Docker Compose + nginx | Un VPS, todo en puerto 80 |

---

## Roles

| Rol | Herramienta | Qué puede hacer |
|---|---|---|
| **Usuario (ciudadano)** | App móvil | Registrar denuncia (anónima o con cuenta), subir evidencia, seguir su caso |
| **Operador** | Dashboard web | Ver y gestionar los casos asignados, actualizar estado, enviar mensajes |
| **Admin** | Dashboard web | Todo lo del operador + crear y gestionar cuentas de personal |

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
docker exec ampara_backend alembic upgrade head
```

### 2 — Crear el primer administrador

```bash
curl -X POST http://localhost:8000/api/v1/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "admin_secret": "TU_ADMIN_SECRET_KEY",
    "nombre": "Admin",
    "email": "admin@ampara.pe",
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
ampara/
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
