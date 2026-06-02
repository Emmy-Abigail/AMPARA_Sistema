# Dashboard Web — SIVAPRE

Panel de gestión epidemiológica para inspectores y administradores. Construido con React + Vite. Accesible desde cualquier navegador moderno en `http://161.132.53.226`.

---

## Índice

1. [¿Qué puede hacer el inspector?](#1-qué-puede-hacer-el-inspector)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Páginas](#3-páginas)
4. [Componentes principales](#4-componentes-principales)
5. [Gestión del estado](#5-gestión-del-estado)
6. [Comunicación con el backend](#6-comunicación-con-el-backend)
7. [Filtros globales](#7-filtros-globales)
8. [Notificaciones de escritorio](#8-notificaciones-de-escritorio)
9. [Estilos](#9-estilos)
10. [Desarrollo local](#10-desarrollo-local)
11. [Construir para producción](#11-construir-para-producción)

---

## 1. ¿Qué puede hacer el inspector?

- **Iniciar sesión** (las cuentas las crea el administrador — no hay registro público)
- **Ver KPIs en tiempo real**: total de reportes ciudadanos, reportes con larvas, casos sospechosos NOTI, casos confirmados NETLAB
- **Explorar el mapa**: reportes ciudadanos con GPS exacto, casos NOTI por provincia, y casos NETLAB confirmados — todo en un solo mapa con capas activables
- **Filtrar toda la vista** por fecha, departamento, provincia y distrito
- **Gestionar reportes desde el feed**: ver foto, datos completos y cambiar el estado (enviado → en revisión → resuelto / rechazado)
- **Ver tendencias semanales**: gráfico comparando reportes ciudadanos vs. confirmados NETLAB
- **Gestionar personal** *(solo administradores)*: crear inspectores/admins, activar y desactivar cuentas

---

## 2. Estructura del proyecto

```
dashboard/
├── index.html
├── vite.config.ts       # Puerto 3000 en dev, proxy /api → backend:8000
├── package.json
├── nginx.conf           # Configuración nginx para producción (en el contenedor Docker)
└── src/
    ├── main.tsx         # Punto de entrada — monta App con React.StrictMode
    ├── App.tsx          # Router + QueryClient + ProtectedRoute
    ├── index.css        # Fuentes Google + Tailwind CSS v4
    ├── api/
    │   ├── client.ts    # Axios con interceptores (JWT + 401 → logout)
    │   └── endpoints.ts # Funciones tipadas para cada endpoint del backend
    ├── components/
    │   ├── FiltrosBar.tsx       # Barra de filtros globales (fecha, ubigeo)
    │   ├── KpiCards.tsx         # 4 tarjetas de métricas con skeleton loaders
    │   ├── MapaVigilancia.tsx   # Mapa Leaflet multicapa con 3 tipos de datos
    │   ├── FeedAcciones.tsx     # Lista de reportes con cambio de estado
    │   ├── TendenciasChart.tsx  # Gráfico de área semanal (Recharts)
    │   ├── layout/
    │   │   ├── Sidebar.tsx      # Menú lateral, logout, navegación por rol
    │   │   └── TopBar.tsx       # Encabezado + campana de alertas
    │   └── ui/
    │       └── Badge.tsx        # Etiqueta coloreada reutilizable
    ├── hooks/
    │   └── useDashboard.ts      # React Query hooks para todos los datos
    ├── pages/
    │   ├── LoginPage.tsx        # Pantalla de inicio de sesión
    │   ├── DashboardPage.tsx    # Página principal (compone todos los componentes)
    │   └── PersonalPage.tsx     # Gestión de cuentas (solo admin)
    ├── store/
    │   └── auth.ts              # Zustand — token y datos del usuario (persiste en localStorage)
    └── types/
        └── index.ts             # Tipos TypeScript de toda la app
```

---

## 3. Páginas

### LoginPage (`/login`)

Formulario de email y contraseña. Llama a `POST /api/v1/auth/login`. Al autenticarse guarda el token en `localStorage` y redirige a `/`. Si ya hay token válido, redirige directamente sin mostrar el formulario.

### DashboardPage (`/`)

Página principal. Solo accesible con sesión activa (redirige a `/login` si no hay token).

Layout:
```
TopBar (título + botón de alertas)
FiltrosBar (fecha desde/hasta, departamento, provincia, distrito)
KpiCards (4 métricas)
[MapaVigilancia — 60% del ancho] [FeedAcciones — 40%]
TendenciasChart
```

En pantallas pequeñas las columnas se apilan verticalmente.

### PersonalPage (dentro de DashboardPage)

Solo visible para usuarios con `rol === 'admin'`. Muestra:
- Formulario para crear nueva cuenta: nombre, email, contraseña inicial, rol
- Lista del personal con su estado (activo/inactivo) y botón de toggle
- Botón para reiniciar contraseña de un inspector

---

## 4. Componentes principales

### KpiCards

Cuatro tarjetas que muestran métricas en tiempo real. Se refrescan automáticamente cada 60 segundos.

| Tarjeta | Color | Qué cuenta |
|---|---|---|
| Total Reportes Ciudadanos | Verde SIVAPRE | Todos los reportes recibidos |
| Reportes con Larvas | Naranja | Donde `observa_larvas = 'Sí, claramente'` |
| Casos Sospechosos (NOTI) | Amarillo | Tabla `casos_noti` del sistema NOTI del MINSA |
| Casos Confirmados (NETLAB) | Rojo | Tabla `casos_netlab` — PCR positivo |

Muestra skeleton loaders (barras grises animadas) mientras carga.

---

### MapaVigilancia

Mapa interactivo con **Leaflet**, centrado en Perú (coordenadas `-9.19, -75.01`, zoom inicial 5).

**Tres capas independientes** — cada una se puede mostrar u ocultar con el control en la esquina superior derecha del mapa:

| Capa | Marcador | Posición | Coloreo |
|---|---|---|---|
| Reportes ciudadanos | Círculo relleno, radio fijo 7px | GPS exacto del reporte | Por estado o por presencia de larvas (selector en el mapa) |
| Casos NOTI | Círculo proporcional a `√(total casos)` | Centroide del departamento | Azul |
| Confirmados NETLAB | Círculo proporcional, levemente desplazado del NOTI | Centroide del departamento | Rojo punteado |

**Colores de reportes por estado:**
- Verde → `enviado`
- Amarillo → `en_revision`
- Gris → `resuelto`
- Rojo → `rechazado`

**Colores de reportes por larvas:**
- Rojo → "Sí, claramente"
- Amarillo → "No estoy seguro"
- Verde → "No"

**Popup al hacer clic** en cualquier marcador: foto (si existe), tipo de lugar/objeto, nombre del ciudadano, fecha, estado y observación de larvas.

**Nota**: NOTI y NETLAB no tienen coordenadas GPS — solo código UBIGEO (departamento). El mapa los posiciona usando una tabla estática `UBIGEO_CENTROIDS` con las coordenadas aproximadas del centroide de cada uno de los 25 departamentos del Perú.

---

### FeedAcciones

Lista de los últimos reportes (máx. 20), refrescada cada 60 segundos.

Cada reporte es una **tarjeta colapsable**:
- **Cabecera visible**: miniatura de foto, tipo de lugar/objeto, badge de larvas, badge de estado, nombre del ciudadano, fecha relativa ("hace 3 horas")
- **Detalle expandido** al hacer clic: foto a tamaño completo, coordenadas GPS, dirección, todos los campos, comentario del ciudadano
- **Botones de cambio de estado**: aparecen todos los estados excepto el actual. Al cambiar el estado también se envía una notificación push al ciudadano.

---

### TendenciasChart

Gráfico de área doble (Recharts `AreaChart`) con las últimas 12 semanas.

- **Línea verde con relleno**: reportes ciudadanos por semana
- **Línea roja con relleno**: casos confirmados NETLAB por semana
- Tooltip al hacer hover con los valores exactos
- Los datos NOTI no se muestran aquí porque usan semana epidemiológica en vez de fecha ISO

---

### Sidebar

Menú lateral fijo (256px), fondo verde oscuro.

- Logo SIVAPRE
- Ítem "Vigilancia" → visible para todos
- Ítem "Gestión de Personal" → **solo visible si `user.rol === 'admin'`**
- Panel inferior: avatar con inicial, nombre, rol y botón de logout

---

### TopBar

Encabezado de la página. Muestra el título, subtítulo y un botón de campana (🔔) con el número de alertas pendientes.

Al hacer clic en la campana se abre un panel desplegable con:
- Resumen de alertas por prioridad (crítica / alta / normal)
- Lista de los reportes más urgentes con foto miniatura, nombre, dirección y tiempo
- Botón para activar notificaciones de escritorio (ver sección [8](#8-notificaciones-de-escritorio))

---

## 5. Gestión del estado

### Zustand — sesión del inspector (`store/auth.ts`)

```typescript
const { token, user, login, logout } = useAuthStore();
```

- `token`: string con el JWT actual
- `user`: `{ nombre, email, rol }` del inspector logueado
- Persiste en `localStorage` — la sesión sobrevive a recargar la página

### React Query — datos del servidor (`hooks/useDashboard.ts`)

| Hook | Refresco | Descripción |
|---|---|---|
| `useKpis(filtros)` | Cada 60 seg | 4 métricas del panel |
| `useFeed(filtros)` | Cada 60 seg | Últimos reportes para el feed |
| `useMapaReportes(filtros)` | Cada 30 seg | Puntos GPS para el mapa |
| `useMapaNoti(filtros)` | Cada 60 seg | Datos NOTI para el mapa |
| `useMapaNetlab(filtros)` | Cada 60 seg | Datos NETLAB para el mapa |
| `useTendencias(filtros)` | Cada 5 min | Series de tiempo semanales |
| `useUbicaciones()` | Permanente (no cambia) | Lista de departamentos para el filtro |
| `useActualizarEstado()` | Mutación | Cambia estado e invalida feed, mapa y KPIs |

Configuración global:
- `retry: 1` — un reintento en caso de error de red
- `staleTime: 30_000` — datos válidos por 30 segundos por defecto

---

## 6. Comunicación con el backend

### Cliente Axios (`api/client.ts`)

```typescript
const client = axios.create({
  baseURL: '/api/v1',   // el proxy de Vite/nginx enruta al backend
  timeout: 15_000,
});
```

**Interceptor de request**: agrega `Authorization: Bearer <token>` en cada petición.

**Interceptor de response**: si el servidor devuelve 401, limpia `localStorage` y redirige a `/login` automáticamente.

### Funciones de API (`api/endpoints.ts`)

```typescript
dashboardApi.login(email, password)
dashboardApi.kpis(filtros)
dashboardApi.mapaReportes(filtros)
dashboardApi.mapaNoti(filtros)
dashboardApi.mapaNetlab(filtros)
dashboardApi.feed(filtros, limit?)
dashboardApi.tendencias(filtros)
dashboardApi.ubicaciones()
dashboardApi.actualizarEstado(id, estado)
dashboardApi.personal.listar()
dashboardApi.personal.crear(datos)
dashboardApi.personal.toggleEstado(id)
```

Los filtros se convierten automáticamente a query params, omitiendo los campos vacíos.

---

## 7. Filtros globales

Todos los endpoints del dashboard aceptan los mismos parámetros opcionales. Los filtros viven como estado en `DashboardPage` y se pasan como prop a todos los componentes.

Cuando cambia un filtro, React Query detecta el cambio en la `queryKey` e invalida automáticamente todos los datos, provocando un refetch.

| Filtro | Tipo | Se envía como |
|---|---|---|
| Fecha desde | `date` | `fecha_desde=YYYY-MM-DD` |
| Fecha hasta | `date` | `fecha_hasta=YYYY-MM-DD` |
| Departamento | `select` (cargado del backend) | `departamento=LORETO` |
| Provincia | `text` | `provincia=MAYNAS` |
| Distrito | `text` | `distrito=IQUITOS` |

La barra de filtros muestra un botón "Limpiar" cuando hay algún filtro activo.

---

## 8. Notificaciones de escritorio

El dashboard puede enviar notificaciones de escritorio del navegador cuando llegan nuevos reportes urgentes (con larvas), aunque el usuario esté en otra pestaña.

### Cómo activarlas

En el panel de la campana, hay un botón "Activar alertas del escritorio". Al hacer clic, el navegador solicita permiso.

### Requisito: HTTPS

La API `Notification` del navegador **solo funciona en contextos seguros (HTTPS)**. El dashboard actualmente sirve en `http://161.132.53.226` (HTTP sin cifrar), por lo que el botón muestra "Requiere HTTPS" en lugar de solicitar el permiso.

Para activar las notificaciones de escritorio se necesita configurar HTTPS con un dominio y Let's Encrypt (ver [05-despliegue.md](./05-despliegue.md)).

### Qué notifica

Una vez activadas, el dashboard envía una notificación cuando:
- Llegan reportes nuevos con larvas confirmadas → "⚠️ N criaderos con larvas"
- Llegan reportes nuevos en general → "📬 N nuevos reportes"

---

## 9. Estilos

El dashboard usa **Tailwind CSS v4** con el plugin de Vite `@tailwindcss/vite`.

### Colores principales

| Color | Hex | Uso |
|---|---|---|
| Verde SIVAPRE | `#0F6E56` | Botones, highlights, íconos activos |
| Verde oscuro | `#0a4535` | Fondo del Sidebar |
| Fondo | `#f0f4f2` | Fondo de la página |
| Surface | `#FFFFFF` | Fondo de tarjetas |
| Rojo | `#EF4444` | NETLAB, larvas confirmadas, alertas críticas |
| Amarillo | `#F59E0B` | En revisión, casos inciertos |

### Fuentes

- **Montserrat ExtraBold**: títulos, cifras grandes, logo
- **Inter**: texto general, labels, descripciones

Cargadas desde Google Fonts en `src/index.css`.

### Responsive

- `< xl (1280px)`: una sola columna — mapa, feed y gráfico apilados verticalmente
- `≥ xl (1280px)`: dos columnas — mapa (60%) + feed (40%), KPIs en 4 columnas

---

## 10. Desarrollo local

```bash
cd dashboard
npm install
npm run dev
# → http://localhost:3000
```

Vite tiene configurado un proxy que redirige `/api` → `http://localhost:8000`. El backend debe estar corriendo:

```bash
cd ..
docker compose up -d   # levanta backend, PostgreSQL y Redis
```

No hay problemas de CORS en desarrollo gracias al proxy de Vite.

---

## 11. Construir para producción

```bash
cd dashboard
npm run build
# Genera dashboard/dist/ con los archivos estáticos optimizados
```

En producción, nginx sirve los archivos de `dist/` y hace proxy de `/api/` al backend. La configuración está en `dashboard/nginx.conf`:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;    # mapeado a dist/ en docker-compose
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000;
    }

    location /uploads/ {
        proxy_pass http://backend:8000;
    }

    location / {
        try_files $uri $uri/ /index.html;  # SPA fallback para React Router
    }
}
```

El bloque `try_files` es fundamental: sin él, recargar el navegador en `/login` daría un 404 porque nginx buscaría el archivo `/login` en disco (que no existe — es React Router quien maneja esa ruta).

Para actualizar el dashboard en el VPS después de un cambio de código, ver [05-despliegue.md](./05-despliegue.md).
