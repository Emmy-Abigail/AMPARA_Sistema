# Dashboard Web — Ampara

Panel de gestión de casos para operadores y administradores. Construido con React + Vite. Accesible desde cualquier navegador en `http://161.132.53.226`.

---

## Índice

1. [¿Qué puede hacer el operador?](#1-qué-puede-hacer-el-operador)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Páginas](#3-páginas)
4. [Componentes principales](#4-componentes-principales)
5. [Gestión del estado](#5-gestión-del-estado)
6. [Comunicación con el backend](#6-comunicación-con-el-backend)
7. [Estilos](#7-estilos)
8. [Desarrollo local](#8-desarrollo-local)
9. [Construir para producción](#9-construir-para-producción)

---

## 1. ¿Qué puede hacer el operador?

- **Iniciar sesión** (cuentas creadas por el admin — no hay registro público)
- **Ver KPIs en tiempo real**: total de casos, urgentes, sin asignar, activos
- **Gestionar expedientes** organizados en tabs:
  - **Activas** — casos en seguimiento activo (excluye cerradas)
  - **Sin asignar** — casos nuevos que nadie ha tomado
  - **Cerradas** — casos resueltos/cerrados
  - **🆘 SOS** — alertas activas (solo visible cuando hay alertas)
- **Ver el mapa** de casos con GPS
- **Asignar un caso** a sí mismo u otro operador
- **Cambiar el estado** de un caso (nueva → asignada → en_seguimiento → ... → cerrada)
- **Enviar mensajes** a la usuaria dentro del caso
- **Atender alertas SOS**: marcar "En atención" para que la usuaria sepa que alguien la está atendiendo, luego "Resolver"
- **Crear operadores y admins** *(solo admin)*
- **Activar/desactivar cuentas de personal** *(solo admin)*

**Scope del operador**: solo ve los casos donde `operador_id == yo` o `estado == "nueva"`. No ve los casos asignados a otros operadores.

---

## 2. Estructura del proyecto

```
dashboard/
├── index.html
├── vite.config.ts       # Puerto 3000 en dev, proxy /api → backend:8000
├── package.json
└── src/
    ├── main.tsx
    ├── App.tsx           # Router + QueryClient + ProtectedRoute
    ├── api/
    │   ├── client.ts     # Axios con interceptores (JWT + 401 → logout)
    │   └── endpoints.ts  # Funciones tipadas para cada endpoint
    ├── components/
    │   ├── FeedAcciones.tsx     # Expedientes con tabs + SOS cards
    │   ├── KpiCards.tsx         # 4 tarjetas de métricas
    │   ├── MapaVigilancia.tsx   # Mapa Leaflet con casos GPS
    │   ├── layout/
    │   │   ├── Sidebar.tsx      # Menú lateral, logout, navegación por rol
    │   │   └── TopBar.tsx       # Encabezado
    │   └── ui/
    │       └── Badge.tsx        # Etiqueta coloreada reutilizable
    ├── hooks/
    │   └── useDashboard.ts      # Todos los React Query hooks
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── DashboardPage.tsx    # Página principal
    │   └── PersonalPage.tsx     # Gestión de personal (solo admin)
    ├── store/
    │   └── auth.ts              # Zustand — token y usuario (persiste en localStorage)
    └── types/
        └── index.ts             # Tipos TypeScript del dashboard
```

---

## 3. Páginas

### LoginPage (`/login`)

Formulario de email y contraseña. Llama a `POST /api/v1/auth/login`. Al autenticarse guarda el token en `localStorage` y redirige a `/`.

### DashboardPage (`/`)

Página principal. Solo accesible con sesión activa.

```
Sidebar
TopBar
KpiCards (4 métricas)
[MapaVigilancia — casos con GPS] [FeedAcciones — expedientes con tabs]
```

En pantallas pequeñas los componentes se apilan verticalmente.

### PersonalPage (dentro de DashboardPage)

Solo visible para `rol === 'admin'`. Formulario para crear nueva cuenta + lista del personal con botón de toggle activo/inactivo.

---

## 4. Componentes principales

### KpiCards

Cuatro tarjetas que se refrescan cada 60 segundos.

| Tarjeta | Qué cuenta |
|---|---|
| Total casos | Todas las denuncias recibidas |
| Casos urgentes | `nivel_riesgo = "urgente"` |
| Sin asignar | `estado = "nueva"` |
| Activos | En `asignada` o `en_seguimiento` |

Muestra skeleton loaders mientras carga.

---

### FeedAcciones

El componente central del dashboard. Muestra los expedientes organizados en **4 tabs**:

| Tab | Contenido | Badge |
|---|---|---|
| **Activas** | Casos con `estado != "cerrada"` (solo activos) | Cantidad |
| **Sin asignar** | Casos con `estado = "nueva"` | Cantidad |
| **Cerradas** | Casos con `estado = "cerrada"` | Cantidad |
| **🆘 SOS** | Alertas con `estado = "activa"` o `"en_atencion"` | Se oculta cuando no hay |

La tab activa pasa el parámetro correcto al backend:
- "Activas" → `solo_activas=true`
- "Sin asignar" → `estado=nueva`
- "Cerradas" → `estado=cerrada`

**Cada tarjeta de expediente** muestra:
- Nivel de riesgo con badge coloreado (urgente = rojo, alto = naranja, medio = amarillo, bajo = verde)
- Estado actual
- Código de acceso (para referencia)
- Fecha de la denuncia
- Botones de cambio de estado
- Botón "Ver mensajes"

**SOS Card** (en el tab SOS):
- Estado: activa (🔴) / en atención (🟡)
- Nombre de la usuaria si tiene cuenta
- Tiempo desde activación
- Coordenadas GPS
- SMS enviados al círculo de confianza
- Enlace "Ver expediente →" si hay denuncia vinculada
- Botón **"En atención"** (operador empieza a atender)
- Botón **"Resolver"** (cierra la alerta + cierra la denuncia si sigue en `nueva`)

---

### MapaVigilancia

Mapa interactivo con **Leaflet**, centrado en Perú.

- Marcadores con coordenadas GPS de las denuncias
- Coloreados por nivel de riesgo: rojo (urgente) / naranja (alto) / amarillo (medio) / verde (bajo)
- Popup al hacer clic: código de acceso, tipo de violencia, estado, fecha

---

### Sidebar

Menú lateral fijo:
- Logo Ampara
- "Expedientes" → visible para todos
- "Gestión de Personal" → **solo visible si `rol === 'admin'`**
- Avatar con inicial, nombre, rol y botón de logout

---

## 5. Gestión del estado

### Zustand — sesión (`store/auth.ts`)

```typescript
const { token, user, login, logout } = useAuthStore();
// Persiste en localStorage — sobrevive a recargar la página
```

### React Query — datos del servidor (`hooks/useDashboard.ts`)

| Hook | Refresco | Descripción |
|---|---|---|
| `useKpis(filtros)` | 60 s | 4 métricas del panel |
| `useDenuncias(filtros, soloActivas)` | 30 s | Expedientes para el feed |
| `useMapaDenuncias(filtros)` | 30 s | Puntos GPS para el mapa |
| `useSosAlertas()` | **10 s** | Alertas SOS activas (intervalo corto por urgencia) |
| `useMarcarSosEnAtencion()` | Mutación | Invalida `['sos']` |
| `useResolverSos()` | Mutación | Invalida `['sos']`, `['denuncias']`, `['kpis']` |
| `useActualizarEstado()` | Mutación | Invalida `['denuncias']`, `['kpis']` |
| `useEnviarMensaje()` | Mutación | Invalida `['mensajes', denunciaId]` |
| `useOperadores()` | Permanente | Lista de operadores para asignar |

---

## 6. Comunicación con el backend

### Cliente Axios (`api/client.ts`)

```typescript
const client = axios.create({
  baseURL: '/api/v1',   // proxy Vite/nginx → backend
  timeout: 15_000,
});
```

**Interceptor de request**: agrega `Authorization: Bearer <token>`.

**Interceptor de response**: si 401 → limpia `localStorage` y redirige a `/login`.

---

## 7. Estilos

**Tailwind CSS v4** con el plugin de Vite.

| Color | Hex | Uso |
|---|---|---|
| Violeta Ampara | `#7C3AED` | Botones, highlights, íconos activos |
| Violeta oscuro | `#4C1D95` | Fondo del sidebar |
| Fondo | `#F5F3FF` | Fondo de la página |
| Surface | `#FFFFFF` | Fondo de tarjetas |
| Rojo urgente | `#EF4444` | Nivel urgente, SOS |
| Naranja alto | `#F97316` | Nivel alto |
| Amarillo medio | `#F59E0B` | Nivel medio |
| Verde bajo | `#22C55E` | Nivel bajo |

**Fuentes** — Montserrat ExtraBold (títulos) + Inter (texto general), cargadas desde Google Fonts.

**Responsive**:
- `< xl (1280px)`: mapa y feed apilados verticalmente
- `≥ xl (1280px)`: dos columnas — mapa (60%) + feed (40%), KPIs en 4 columnas

---

## 8. Desarrollo local

```bash
cd dashboard
npm install
npm run dev
# → http://localhost:3000
```

Vite proxea `/api` → `http://localhost:8000`. El backend debe estar corriendo:

```bash
docker compose up -d   # backend, PostgreSQL, Redis
```

---

## 9. Construir para producción

```bash
cd dashboard
npm run build
# Genera dashboard/dist/ con los archivos estáticos optimizados
```

nginx sirve `dist/` y hace proxy de `/api/` al backend:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;

    location /api/ {
        proxy_pass http://backend:8000;
    }

    location /uploads/ {
        proxy_pass http://backend:8000;
    }

    location / {
        try_files $uri $uri/ /index.html;  # SPA fallback — sin esto, F5 en /login daría 404
    }
}
```

Para actualizar el dashboard en producción, ver [05-despliegue.md](./05-despliegue.md).
