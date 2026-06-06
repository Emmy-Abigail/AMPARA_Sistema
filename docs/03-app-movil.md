# App Móvil — Ampara

Aplicación Android para usuarias. Construida con React Native (Expo SDK 54). Permite reportar violencia de género con foto, audio y GPS; funciona completamente offline; incluye alerta SOS con SMS al círculo de confianza y chat con el operador asignado.

---

## Índice

1. [¿Qué puede hacer la usuaria?](#1-qué-puede-hacer-la-usuaria)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Navegación y pantallas](#3-navegación-y-pantallas)
4. [Arquitectura offline-first](#4-arquitectura-offline-first)
5. [Modo anónimo](#5-modo-anónimo)
6. [Gestión del estado](#6-gestión-del-estado)
7. [Comunicación con el backend](#7-comunicación-con-el-backend)
8. [Servicios cercanos offline](#8-servicios-cercanos-offline)
9. [Temas y estilos](#9-temas-y-estilos)
10. [Variables de entorno](#10-variables-de-entorno)
11. [Construir el APK con EAS](#11-construir-el-apk-con-eas)

---

## 1. ¿Qué puede hacer la usuaria?

- **Usar la app sin cuenta** — modo anónimo: datos solo en el dispositivo, aislados por `device_id`
- **Registrarse y mantener sesión activa** hasta 30 días sin volver a loguear
- **Registrar una denuncia de VG**:
  - Tipos de violencia (selección múltiple): Física, Psicológica, Verbal, Sexual, Económica, Digital
  - Relación con la persona agresora
  - Factores de riesgo (amenazas de muerte, acceso a armas, convivencia, etc.)
  - El nivel de riesgo se calcula automáticamente
  - Foto y/o audio como evidencia
  - Ubicación GPS (funciona offline)
  - Descripción libre
  - Preferencia de contacto
- **Ver sus casos** con estado actual, nivel de riesgo y mensajes del operador
- **Chatear con el operador** asignado al caso
- **Activar alerta SOS**: envía su ubicación GPS por SMS a su círculo de confianza; crea automáticamente un caso urgente vinculado
- **Ver la alerta SOS activa** como tarjeta en "Mis casos", con estado en tiempo real
- **Cancelar el SOS** (también disponible para usuarias anónimas)
- **Gestionar su círculo de confianza**: hasta 4 contactos (hasta 2 si es anónima, guardados en local)
- **Ver comisarías y CEMs cercanos** sin necesidad de internet
- **Cambiar el ícono de la app** para disfrazar de otra aplicación (seguridad)
- **Crear cuenta directamente desde el perfil** si empezó como anónima
- **Modo claro / oscuro / sistema**

---

## 2. Estructura del proyecto

```
mobile/
├── app.json          # Expo: nombre, ícono, splash, plugins, permisos
├── eas.json          # Perfiles de build (development / preview / production)
├── package.json
└── src/
    ├── hooks/
    │   ├── useAuth.ts           # Login, registro, logout (React Query mutations)
    │   ├── useDenuncias.ts      # CRUD denuncias (React Query)
    │   └── useCasosLocales.ts   # Lee casos desde SQLite local
    ├── navigation/
    │   └── index.tsx            # Toda la navegación: Root → Auth → Main → Tabs
    ├── screens/
    │   ├── SplashScreen.tsx
    │   ├── WelcomeScreen.tsx        # Bienvenida + redirección si hay pendingAuthScreen
    │   ├── LoginScreen.tsx
    │   ├── RegisterScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── ReportScreen.tsx         # Formulario offline-first
    │   ├── MyReportsScreen.tsx      # Lista de casos + SOS card integrada
    │   ├── ReporteDetalleScreen.tsx
    │   ├── SOSScreen.tsx            # Activación de alerta SOS
    │   ├── InfoScreen.tsx           # Recursos y servicios de ayuda
    │   ├── PerfilScreen.tsx         # Perfil, círculo, servicios cercanos, ajustes
    │   ├── EditarPerfilScreen.tsx
    │   └── CambiarPasswordScreen.tsx
    ├── services/
    │   ├── api.ts              # Cliente axios con interceptores (token + refresh silencioso)
    │   ├── auth.ts             # Funciones de autenticación
    │   ├── denuncias.ts        # Funciones de denuncias
    │   ├── db.ts               # Cola SQLite offline
    │   ├── sync.ts             # Motor de sincronización offline→servidor
    │   ├── sos.ts              # Activar / cancelar / listar alertas SOS
    │   ├── casosLocales.ts     # Leer/guardar casos en SQLite local
    │   ├── notifications.ts    # Registro de push token
    │   ├── iconCamouflage.ts   # Cambio del ícono de la app
    │   └── serviciosEstaticos.ts # Búsqueda local de comisarías y CEMs
    ├── store/
    │   ├── auth-context.tsx    # Contexto global: isAuthenticated, usuario, pendingAuthScreen
    │   ├── auth-signal.ts      # Señal para cerrar sesión desde el interceptor axios
    │   └── storage.ts          # Wrapper tipado sobre SecureStore y AsyncStorage
    ├── theme/
    │   └── index.ts            # Colores, modo claro/oscuro
    └── types/
        └── index.ts            # Tipos TypeScript + definición de todos los stacks de navegación
```

---

## 3. Navegación y pantallas

### Estructura de navegación

```
RootStack
│
├── SplashScreen          Verifica sesión en SecureStore. Dura ~1.8 s con animación.
│
├── AuthStack  (sin sesión)
│   ├── WelcomeScreen     Si pendingAuthScreen='Register' → navega directo a Register
│   ├── LoginScreen
│   └── RegisterScreen
│
└── MainStack  (con sesión, incluye modo anónimo)
    ├── Tabs (barra inferior — 5 tabs)
    │   ├── Inicio       (HomeScreen)
    │   ├── Reportar     (ReportScreen)
    │   ├── SOS          (SOSScreen)  ← botón rojo central elevado
    │   ├── Mis casos    (MyReportsScreen)
    │   └── Recursos     (InfoScreen)
    │
    ├── ReporteDetalle
    ├── Perfil
    ├── EditarPerfil
    └── CambiarPassword
```

### Descripción de pantallas

**SplashScreen** — Logo animado. Verifica `AUTH_TOKEN` y `GUEST_MODE` en SecureStore/AsyncStorage. Navega a Auth o Main.

**WelcomeScreen** — Tres acciones: "Crear una cuenta", "Iniciar sesión", "Continuar de forma anónima". Si hay `pendingAuthScreen='Register'` en el contexto (viene de "Crear cuenta" en el perfil anónimo), navega automáticamente a RegisterScreen usando `useLayoutEffect` — sin flash visible.

**HomeScreen** — Saludo personalizado con el nombre de la usuaria (o "Usuaria anónima"). Acceso rápido a reportar y al SOS. KPIs personales del estado de los casos.

**ReportScreen** — Formulario offline-first:

| Campo | Obligatorio | Detalle |
|---|---|---|
| Tipo de violencia | ✅ | Chips multi-selección: Física / Psicológica / Verbal / Sexual / Económica / Digital |
| Relación agresor | ✅ | Chips: Pareja o expareja / Familiar / Conocido/a / Figura de autoridad / Desconocido/a |
| Factores de riesgo | No | Chips: amenazas de muerte / acceso a armas / violencia escalando / convive / seguimiento / orden alejamiento violada |
| Foto | No | Cámara o galería |
| Audio | No | Grabación directa |
| GPS | No | Se captura automáticamente si hay permiso |
| Descripción | No | Texto libre |
| Preferencia contacto | ✅ | App / Llamada / Ninguno |

El `nivel_riesgo` lo calcula el backend automáticamente.

**MyReportsScreen** — Lista unificada con:
- **SOS card** al inicio (si hay alerta activa o en atención), con: estado en tiempo real (poll cada 30 s), SMS enviados, mensaje contextual, botón "Ver mensajes", botón "Cancelar" (solo si activa)
- **Tarjetas de casos** con badges de estado y nivel de riesgo
- Filtros: Todos / Activos / Cerrados
- Tap en una tarjeta → `ReporteDetalleScreen`

**SOSScreen** — Botón grande de activación de alerta SOS. Muestra confirmación antes de activar. Si hay alerta activa, muestra el estado actual.

**PerfilScreen** — Secciones:
- Avatar e info del usuario (o "Usuaria anónima" con badge)
- Círculo de confianza (API si tiene cuenta / AsyncStorage local si es anónima, máx. 2)
- Notificaciones (toggles con persistencia local)
- Apariencia (tema claro/oscuro/sistema)
- Ícono de camuflaje (6 opciones)
- Cuenta y seguridad:
  - **Con cuenta**: Editar perfil / Cambiar contraseña / Cerrar sesión
  - **Anónima**: descripción modo anónimo / **Crear cuenta** (→ RegisterScreen directo) / Salir a la pantalla inicial
- Salir y borrar historial visible (para todas)
- Servicios cercanos (comisarías y CEMs con PostGIS)

---

## 4. Arquitectura offline-first

La app **siempre** guarda la denuncia localmente primero.

### Cola SQLite (`ampara.db`)

```
Usuaria presiona "Enviar":
  1. insertPendingDenuncia() → SQLite local (siempre funciona, sin red)
  ↓
  2. syncPendingDenuncias() — fire-and-forget

  CON SEÑAL:
  ├── Sube foto/audio al servidor
  ├── POST /denuncias
  ├── markAsSent() → estado = 'enviado'
  └── Actualiza la entrada local con el ID del servidor

  SIN SEÑAL:
  ├── markAsFailed() → retry_count++
  └── Tres mecanismos de reintento:
      1. NetInfo listener → sync cuando vuelve la conexión
      2. AppState listener → sync cuando la app regresa al primer plano
      3. BackgroundFetch → cada ~15 min (el SO puede throttlear esto)
```

### Estados de una denuncia en SQLite

| Estado | Significado |
|---|---|
| `pendiente` | Guardada localmente, no enviada |
| `enviando` | Sync en progreso |
| `enviado` | Confirmada por el servidor |
| `fallido` | Error — se reintenta hasta 10 veces |

**Límite de reintentos**: 10. Un reporte con 10 fallos deja de procesarse (un error 422 de validación no se resuelve reintentando). Se limpia después de 7 días.

**Recuperación de crash**: si la app se cierra con una denuncia en `enviando`, al reiniciar `initDb()` la resetea a `pendiente`.

### Idempotencia con el servidor

Cada denuncia lleva:
- `device_id`: UUID único del dispositivo (se genera una vez y persiste)
- `local_id`: UUID generado al abrir el formulario

Si el sync envía la misma denuncia dos veces, el servidor devuelve la denuncia existente. No se crean duplicados.

---

## 5. Modo anónimo

Al entrar como anónima (`loginAsGuest()`):
- Se pone `GUEST_MODE=true` en AsyncStorage
- Se genera (o recupera) un `DEVICE_ID` UUID único en AsyncStorage
- `isAuthenticated = true` — el stack de navegación es el mismo que para usuarias con cuenta
- `usuario = null` — la app renderiza condicionalmente según `!!usuario`

**Aislamiento de datos**: el backend filtra con `device_id` → cada dispositivo solo ve sus propios casos. Dos usuarias anónimas nunca ven los datos de la otra.

**Círculo de confianza en modo anónimo**: se guarda en `AsyncStorage` (no en el servidor), máximo 2 contactos.

**Código de acceso**: el backend genera un código de 6 caracteres (`AB3K7P`) para que la usuaria pueda seguir su caso si cambia de dispositivo.

**Crear cuenta desde el perfil**: la opción "Crear cuenta" en `PerfilScreen`:
1. Guarda `pendingAuthScreen = 'Register'` en `AuthContext`
2. Llama a `logout()` — el root navigator cambia a `AuthStack`
3. `WelcomeScreen` detecta `pendingAuthScreen` con `useLayoutEffect` y navega a `RegisterScreen`
4. El back stack queda `[Welcome → Register]` para que el retroceso funcione

---

## 6. Gestión del estado

### AuthContext (`store/auth-context.tsx`)

```typescript
const {
  isAuthenticated,       // boolean
  usuario,               // Usuario | null
  setIsAuthenticated,
  setUsuario,
  splashShown,
  pendingAuthScreen,     // 'Register' | null — para navegar directo a registro
  setPendingAuthScreen,
} = useAuthContext();
```

### React Query

Para datos del servidor. Gestiona automáticamente caché, revalidación e invalidación.

### SecureStore y AsyncStorage (`store/storage.ts`)

| Dato | Dónde | Por qué |
|---|---|---|
| `AUTH_TOKEN` | SecureStore | JWT — cifrado por el SO |
| `REFRESH_TOKEN` | SecureStore | JWT — cifrado por el SO |
| `USER_DATA` | AsyncStorage | Datos del perfil |
| `DEVICE_ID` | AsyncStorage | UUID del dispositivo |
| `GUEST_MODE` | AsyncStorage | Si es sesión anónima |
| `TRUSTED_CONTACT` | AsyncStorage | Círculo de confianza anónimo |

**SecureStore vs AsyncStorage**: AsyncStorage en Android es texto plano en `/data/data/[app]/` — legible en dispositivos rooteados. SecureStore usa Android Keystore del sistema.

---

## 7. Comunicación con el backend

### Cliente axios (`services/api.ts`)

```typescript
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15_000,
});
```

**Interceptor de request**: agrega JWT en cada petición autenticada. Para usuarias anónimas, agrega el header `X-Device-Id`.

**Interceptor de response — refresh silencioso**: cuando el servidor devuelve 401:
1. Toma el refresh token de SecureStore
2. Llama a `POST /auth/refresh`
3. Guarda el nuevo par de tokens
4. Reintenta la petición original

El flag `isRefreshing` y la cola `pendingQueue` evitan múltiples llamadas a `/refresh` simultáneas.

---

## 8. Servicios cercanos offline

`PerfilScreen` muestra las 4 comisarías y 2 CEMs más cercanos usando la ubicación GPS del dispositivo.

- Dataset estático de comisarías y CEMs del Perú embebido en el APK (`serviciosEstaticos.ts`)
- Si hay conexión, intenta primero el servidor (`/servicios/cercanos`) que puede incluir datos actualizados
- Fallback offline con `buscarServiciosLocales(lat, lon)` — cálculo Haversine local
- Muestra nombre, distancia, horario y botones para llamar / abrir mapa
- **100% offline** en el fallback

---

## 9. Temas y estilos

### Paleta de colores Ampara

| Variable | Color claro | Uso |
|---|---|---|
| `primary` | `#7C3AED` (violeta) | Botones, tabs activos, avatares |
| `background` | `#F5F3FF` | Fondo de pantallas |
| `surface` | `#FFFFFF` | Fondo de tarjetas |
| `error` | `#EF4444` | Errores, SOS |
| `text` | `#1A1033` | Texto principal |

El modo oscuro invierte los fondos manteniendo el violeta como acento. Persiste en `AsyncStorage`.

### Fuentes

- **Montserrat ExtraBold**: títulos, cifras, labels de tab activos, botones
- **Inter Regular**: cuerpo de texto, descripciones, placeholders

Cargadas con `expo-font` al inicio.

### Ícono de camuflaje

La app puede cambiar su ícono en la pantalla de inicio del móvil para parecer otra aplicación (calculadora, clima, etc.). La preferencia persiste en AsyncStorage.

---

## 10. Variables de entorno

```
EXPO_PUBLIC_API_URL=http://161.132.53.226/api/v1
```

Configuradas por perfil en `eas.json`:

| Perfil | `EXPO_PUBLIC_API_URL` | Tipo |
|---|---|---|
| `development` | `http://localhost:8000/api/v1` | APK debug |
| `preview` | `http://161.132.53.226/api/v1` | APK de prueba (distribución interna) |
| `production` | `https://api.ampara.pe/api/v1` | AAB para Google Play Store |

Las variables `EXPO_PUBLIC_*` se hornean en el bundle JavaScript al hacer el build — son visibles en el APK compilado. No usar para secretos.

---

## 11. Construir el APK con EAS

### Requisitos

```bash
npm install -g eas-cli
eas login   # con la cuenta emmy_lopez en expo.dev
```

### APK de prueba (preview)

```bash
cd mobile
eas build --platform android --profile preview
# Al terminar: enlace de descarga en expo.dev/accounts/emmy_lopez/projects/ampara/builds
```

### Ver builds anteriores

```bash
eas build:list --platform android --limit 5
```

### Cuándo reconstruir el APK

| Cambio | ¿Rebuild necesario? |
|---|---|
| Cambio en código TypeScript/TSX | No (si se usa EAS Update) |
| Cambio en `EXPO_PUBLIC_API_URL` | **Sí** |
| Nuevo paquete nativo | **Sí** |
| Cambio en `app.json` (íconos, permisos, plugins) | **Sí** |

### Actualización OTA (sin rebuild)

Para cambios solo en código TypeScript:

```bash
eas update --branch preview --message "descripción del cambio"
```

Los usuarios reciben la actualización la próxima vez que abren la app.
