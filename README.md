# Ampara

**Plataforma de denuncias de violencia de género**

Ampara permite a cualquier persona reportar situaciones de violencia de género desde su celular — de forma anónima o con cuenta — y a operadores gestionar esos casos desde un panel web. Incluye alerta SOS con notificación por SMS al círculo de confianza.

---

## Componentes

| Componente | Tecnología | Descripción |
|---|---|---|
| **App móvil** | React Native + Expo SDK 54 | Android — offline-first, modo anónimo, alerta SOS, mensajería con operador |
| **Backend (API)** | FastAPI + PostgreSQL + PostGIS + Redis | API REST, JWT + autenticación opcional, almacenamiento de evidencia, rate limiting |
| **Dashboard web** | React + Vite | Operadores y admin — expedientes, mapa, mensajería, alertas SOS en tiempo real |
| **Infraestructura** | Docker Compose + nginx | Un VPS, todo en puerto 80 |

---

## Roles

| Rol | Herramienta | Qué puede hacer |
|---|---|---|
| **Usuaria (ciudadana)** | App móvil | Registrar denuncia (anónima o con cuenta), subir evidencia, chatear con operador, activar SOS |
| **Operador** | Dashboard web | Ver y gestionar sus casos asignados + sin asignar, enviar mensajes, atender SOS |
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
├── backend/           # API FastAPI + modelos + migraciones Alembic
├── mobile/            # App React Native (Expo SDK 54)
├── dashboard/         # Panel web React + Vite
├── docs/              # Documentación completa
└── docker-compose.yml # Orquestación de todos los servicios
```

---

## Documentación

Ver la carpeta [`docs/`](./docs/) para la documentación técnica completa.

---

## Producción

| Servicio | Servidor | URL | Acceso |
|---|---|---|---|
| API (backend) | VPS pública | http://161.132.53.226/api/v1 | Internet — app móvil |
| Dashboard | Raspberry Pi | http://10.234.162.153 | Solo red local — operadores |
| APK (Android) | expo.dev | expo.dev → proyecto ampara | Internet |

La Pi corre el stack completo de gestión (dashboard + BD + backend). Al estar en red local, los datos de las víctimas nunca quedan expuestos en internet.
