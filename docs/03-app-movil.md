# App Móvil — SIVAPRE

Aplicación Android para ciudadanos. Construida con React Native (Expo SDK 54). Permite reportar criaderos de mosquitos con foto y GPS, funciona completamente offline y sincroniza con el servidor cuando hay conexión.

---

## Índice

1. [¿Qué puede hacer el usuario?](#1-qué-puede-hacer-el-usuario)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Navegación y pantallas](#3-navegación-y-pantallas)
4. [Arquitectura offline-first](#4-arquitectura-offline-first)
5. [Gestión del estado](#5-gestión-del-estado)
6. [Comunicación con el backend](#6-comunicación-con-el-backend)
7. [Hospitales offline](#7-hospitales-offline)
8. [Notificaciones push](#8-notificaciones-push)
9. [Temas y estilos](#9-temas-y-estilos)
10. [Variables de entorno](#10-variables-de-entorno)
11. [Construir el APK con EAS](#11-construir-el-apk-con-eas)

---

## 1. ¿Qué puede hacer el usuario?

- **Registrarse** con nombre, email, contraseña y ubicación (departamento/provincia/distrito)
- **Iniciar sesión** y mantener la sesión activa hasta 30 días sin necesidad de volver a loguear
- **Reportar un criadero de mosquitos**:
  - Toma una foto obligatoria con la cámara
  - Captura su ubicación GPS (obligatorio) con dirección postal automática
  - Elige el tipo de lugar, tipo de objeto, si observa larvas y si conoce casos de dengue cerca
  - Agrega comentarios opcionales
  - El reporte se guarda localmente aunque no tenga señal
- **Ver sus reportes anteriores** con el estado actual (enviado, en revisión, resuelto...)
- **Ver alertas de su zona**: criaderos reportados cerca de donde vive el usuario
- **Ver los 3 centros de salud más cercanos** sin necesidad de internet
- **Editar su perfil**: nombre, teléfono, ubicación
- **Cambiar su contraseña**
- **Recibir notificaciones push** cuando un inspector actualiza el estado de su reporte

---

## 2. Estructura del proyecto

```
mobile/
├── app.json          # Configuración Expo: nombre, ícono, splash, plugins, permisos
├── eas.json          # Perfiles de build (development / preview / production)
├── package.json
├── .env              # EXPO_PUBLIC_API_URL para desarrollo local
└── src/
    ├── components/
    │   ├── SivapreLogo.tsx     # Logo SVG vectorial (nítido en cualquier resolución)
    │   └── UbigeoSelector.tsx  # Selector de departamento/provincia/distrito con búsqueda
    ├── data/
    │   └── hospitales.json     # 617 establecimientos de salud del Perú (embebido en APK)
    ├── hooks/
    │   ├── useAuth.ts          # Login, registro, perfil, logout (React Query mutations)
    │   └── useReportes.ts      # CRUD de reportes (React Query queries + mutations)
    ├── navigation/
    │   └── index.tsx           # Definición de toda la navegación
    ├── screens/
    │   ├── SplashScreen.tsx
    │   ├── WelcomeScreen.tsx
    │   ├── LoginScreen.tsx
    │   ├── RegisterScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── ReportScreen.tsx           # Formulario offline-first
    │   ├── MyReportsScreen.tsx
    │   ├── ReporteDetalleScreen.tsx
    │   ├── InfoScreen.tsx
    │   ├── PerfilScreen.tsx
    │   ├── EditarPerfilScreen.tsx
    │   └── CambiarPasswordScreen.tsx
    ├── services/
    │   ├── api.ts              # Cliente axios con interceptores (token + refresh)
    │   ├── auth.ts             # Funciones de autenticación
    │   ├── reportes.ts         # Funciones de reportes (con crearRaw para sync engine)
    │   ├── db.ts               # Cola SQLite offline (insertPendingReport, etc.)
    │   ├── sync.ts             # Motor de sincronización offline→servidor
    │   └── notifications.ts   # Registro de push token
    ├── store/
    │   ├── auth-context.tsx    # Contexto global: isAuthenticated, usuario
    │   ├── auth-signal.ts      # Señal para cerrar sesión desde el interceptor axios
    │   └── storage.ts          # Wrapper tipado sobre SecureStore y AsyncStorage
    ├── theme/
    │   └── index.ts            # Colores, modo claro/oscuro
    └── types/
        └── index.ts            # Tipos TypeScript de toda la app
```

---

## 3. Navegación y pantallas

### Estructura de navegación

```
RootNavigator
│
├── SplashScreen
│     Verifica si hay sesión guardada en SecureStore.
│     Dura 1.8 segundos con animación del logo.
│
├── Auth Stack  (sin sesión activa)
│   ├── WelcomeScreen   → primera pantalla para usuarios nuevos
│   ├── LoginScreen     → email + contraseña
│   └── RegisterScreen  → nombre, email, contraseña, ubigeo
│
└── Main Stack  (con sesión activa)
    ├── Tabs (barra inferior)
    │   ├── Inicio       (HomeScreen)
    │   ├── Reportar     (ReportScreen)
    │   ├── Mis reportes (MyReportsScreen)
    │   └── Información  (InfoScreen)
    │
    ├── ReporteDetalle    → detalle de un reporte (slide desde la derecha)
    ├── Perfil
    ├── EditarPerfil
    └── CambiarPassword
```

### Descripción de cada pantalla

**SplashScreen**
Logo SVG animado con barra de progreso. Mientras se muestra, verifica en SecureStore si hay sesión activa. Navega automáticamente a Auth o Main.

**WelcomeScreen**
Pantalla de bienvenida para usuarios nuevos. Tiene botones para ir a Login o Register.

**LoginScreen**
Campos de email y contraseña. Muestra un banner verde de éxito si viene del registro. Maneja errores de credenciales incorrectas o cuenta desactivada.

**RegisterScreen**
Nombre, apellido, email, contraseña. Selector `UbigeoSelector` para departamento/provincia/distrito con búsqueda en tiempo real. Al registrarse redirige a Login (no hace auto-login).

**HomeScreen**
- Saludo personalizado con el primer nombre y avatar con la inicial.
- Botón prominente "Reportar un criadero ahora".
- KPIs personales: cuántos reportes tiene enviados, en revisión, resueltos.
- Alertas de zona: criaderos reportados cerca de donde vive el usuario. Si no tiene ubicación configurada, muestra un link para ir al perfil.

**ReportScreen** ← el más importante
Formulario offline-first para reportar un criadero. Campos:

| Campo | Obligatorio | Notas |
|---|---|---|
| Foto | ✅ | Cámara. Copia el archivo a un directorio persistente de la app |
| Ubicación GPS | ✅ | Funciona offline (satélite). Incluye dirección postal por geocodificación inversa |
| Tipo de lugar | ✅ | Chips: Vivienda / Vía Pública / Terreno Abandonado / Mercado / Colegio / Otro |
| Tipo de objeto | ✅ | Chips: Llantas / Baldes / Plantas / Botellas / Canales / Otro |
| ¿Observas larvas? | ✅ | Chips: Sí, claramente / No estoy seguro / No |
| ¿Casos de dengue cerca? | ✅ | Chips: Sí / No lo sé / No |
| Comentarios | No | Texto libre |

El botón "Enviar" solo se activa cuando todos los campos obligatorios están completos.

**MyReportsScreen**
Lista paginada de los reportes del usuario con badge de estado coloreado. Filtros por estado (Todos / Enviado / En revisión / Resuelto / Rechazado). Si no hay reportes, muestra "Crear primer reporte" que navega directamente al tab de reporte.

**ReporteDetalleScreen**
Foto del criadero, todos los campos, estado con color e ícono. Botón para cancelar el reporte si está en estado `enviado`.

**InfoScreen**
Información educativa sobre el dengue y el zancudo Aedes aegypti, mitos y verdades, contactos de emergencia.

**PerfilScreen**
Datos del usuario. Sección de los 3 centros de salud más cercanos (funciona offline). Acceso a editar perfil y cambiar contraseña.

**EditarPerfilScreen**
Campos pre-llenados con la información actual. Email no se puede cambiar. El botón Guardar solo aparece si hay cambios reales.

**CambiarPasswordScreen**
Contraseña actual, nueva y confirmación. Validación en tiempo real. Ícono de ojo para mostrar/ocultar cada campo.

---

## 4. Arquitectura offline-first

La app **siempre** guarda el reporte localmente primero. La red solo se usa para sincronizar. Un reporte no puede perderse por falta de conexión.

### Cola SQLite local (`sivapre.db`)

Cuando el usuario presiona "Enviar reporte":

```
1. insertPendingReport()
   → reporte guardado en SQLite local
   → SIEMPRE succeeds (no depende de la red)
   ↓
2. syncPendingReports() — fire-and-forget (no bloquea la UI)

   CON SEÑAL:
   ├── Sube la foto al servidor (si hay foto_local_uri y no hay foto_url aún)
   ├── POST /reportes al backend
   ├── markAsSent() → estado = 'enviado'
   └── Borra el archivo de foto local (libera espacio)

   SIN SEÑAL O ERROR:
   ├── markAsFailed() → estado = 'fallido', retry_count++
   └── 3 mecanismos de reintento automático:
       1. NetInfo listener → sync cuando vuelve la conexión
       2. AppState listener → sync cuando la app regresa a primer plano
       3. BackgroundFetch → cada ~15 min (iOS/Android lo throttlean,
          no es confiable como mecanismo principal)
```

### Estados de un reporte en SQLite

| Estado | Significado |
|---|---|
| `pendiente` | Guardado localmente, no enviado aún |
| `enviando` | Sync en progreso |
| `enviado` | Confirmado por el servidor |
| `fallido` | Error al enviar — se reintenta automáticamente |

**Límite de reintentos**: 10. Un reporte con 10 fallos deja de procesarse (un error 422 de validación no se va a resolver solo reintentando). Queda en SQLite y se limpia a los 7 días.

**Recuperación de crash**: si la app se cierra con un reporte en `enviando`, al reiniciar `initDb()` lo resetea a `pendiente` para que no quede abandonado.

**Flag de concurrencia**: la variable `isSyncing` evita que dos sync corran al mismo tiempo (por ejemplo si NetInfo y AppState se disparan simultáneamente).

### Idempotencia con el servidor

Cada reporte lleva:
- `device_id`: UUID único del dispositivo (se genera una vez y se persiste)
- `local_id`: UUID generado al crear el formulario

Si el sync envía el mismo reporte dos veces (reintento), el servidor devuelve HTTP 409 y la app lo marca como `enviado`. No se crean duplicados.

### Nota técnica — null en expo-sqlite v15 (Android)

`runSync` y `runAsync` usan el mismo código nativo Kotlin internamente. Cuando se pasa `null` como valor en el objeto de params, el bridge JS→Kotlin lo serializa como un objeto vacío `{}` en vez de `null` primitivo, causando:

```
[runSync] Cannot convert '[object Object]' to a Kotlin type
```

**Solución**: los campos opcionales (`comentarios`, `direccion`, etc.) se omiten del objeto de params cuando son `null`. SQLite trata automáticamente los parámetros nombrados no enlazados como `NULL` nativo.

```typescript
// ✗ Causa crash en Android:
{ $comentarios: null }

// ✓ Correcto — SQLite infiere NULL para $comentarios:
{ $local_id: "...", $tipo_lugar: "Vivienda" }  // $comentarios ausente del objeto
```

Este problema solo ocurre en el APK standalone. En Expo Go, el bridge es diferente y no lo reproduce.

---

## 5. Gestión del estado

### AuthContext (`store/auth-context.tsx`)

Estado global de autenticación. Persiste en AsyncStorage para sobrevivir a cerrar la app.

```typescript
const { isAuthenticated, usuario, setUsuario, setIsAuthenticated } = useAuthContext();
```

Campos:
- `isAuthenticated`: boolean — si hay sesión activa
- `splashShown`: boolean — si ya pasó el splash
- `usuario`: datos del usuario logueado (nombre, email, rol, ubigeo...)

### React Query (`@tanstack/react-query`)

Para los datos del servidor (reportes, alertas de zona). Gestiona automáticamente:
- Estado de carga (`isLoading`)
- Errores (`isError`)
- Caché (no repite peticiones si los datos son recientes)
- Invalidación (actualiza la lista después de crear o cancelar un reporte)

### SecureStore y AsyncStorage (`store/storage.ts`)

| Dato | Dónde se guarda | Por qué |
|---|---|---|
| `AUTH_TOKEN` | SecureStore | Token JWT — cifrado por el SO |
| `REFRESH_TOKEN` | SecureStore | Token JWT — cifrado por el SO |
| `USER_DATA` | AsyncStorage | Datos del perfil — no es secreto |
| `DEVICE_ID` | AsyncStorage | UUID del dispositivo para idempotencia |

**SecureStore vs AsyncStorage**: AsyncStorage en Android es texto plano en `/data/data/[app]/` — legible en dispositivos rooteados. SecureStore usa Android Keystore y requiere acceso al keystore del sistema operativo.

---

## 6. Comunicación con el backend

### Cliente axios (`services/api.ts`)

```typescript
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,  // inyectado en build por EAS
  timeout: 15_000,
});
```

**Interceptor de request**: agrega el token JWT en cada petición autenticada.

**Interceptor de response — refresh silencioso**:
Cuando el servidor devuelve 401 (access token expirado):
1. Toma el refresh token de SecureStore
2. Llama a `POST /auth/refresh`
3. Guarda el nuevo par de tokens
4. Reintenta la petición original con el nuevo token

Si el refresh también falla (sesión expirada), dispara `triggerUnauthorized()` que cierra la sesión automáticamente.

El flag `isRefreshing` y la cola `pendingQueue` evitan que múltiples peticiones simultáneas que fallan con 401 generen múltiples llamadas a `/refresh`. Solo una llama a refresh; las demás esperan en cola y se reintentan cuando llega el nuevo token.

### `services/reportes.ts` — `crearRaw()`

El método `crearRaw()` es usado exclusivamente por el sync engine. A diferencia de `crear()` que lanza excepciones genéricas, `crearRaw()` devuelve el status HTTP y el body de la respuesta para que el sync engine pueda registrarlos en SQLite con fines de debugging.

---

## 7. Hospitales offline

`PerfilScreen` muestra los 3 centros de salud más cercanos al usuario usando el GPS del dispositivo.

- **617 establecimientos** de todo el Perú embebidos en `src/data/hospitales.json` dentro del APK.
- Cálculo con la fórmula **Haversine** (distancia en la superficie de una esfera) sobre las coordenadas del usuario y cada hospital.
- Muestra nombre, tipo de establecimiento y distancia en metros o kilómetros.
- **100% offline** — no hace ninguna petición a internet.

El dataset viene del sistema RENAES del MINSA.

---

## 8. Notificaciones push

### Configuración al hacer login

Al iniciar sesión, `notifications.ts` ejecuta automáticamente:
1. Solicita permiso de notificaciones al sistema operativo.
2. Crea el canal de Android `"reportes"` (prioridad alta, color verde SIVAPRE).
3. Obtiene el Expo Push Token del dispositivo.
4. Lo envía a `POST /api/v1/auth/push-token`.

### Estado actual — Firebase pendiente

Las notificaciones push en APK standalone de Android requieren **Firebase Cloud Messaging (FCM)**. Actualmente no está configurado.

Para activarlas:
1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com)
2. Agregar una app Android con el package name de la app
3. Descargar `google-services.json` y colocarlo en `mobile/`
4. Agregar `"@config-plugins/expo-firebase-core"` en `app.json` → `plugins`
5. Hacer un nuevo build con EAS

Las notificaciones **sí funcionan** en Expo Go (usa el servidor FCM propio de Expo). Solo fallan en el APK standalone.

---

## 9. Temas y estilos

### Colores

| Variable | Color | Uso |
|---|---|---|
| `primary` | `#0F6E56` | Verde SIVAPRE — botones, tabs activos, avatares |
| `background` | `#F5FAF8` | Fondo de pantallas |
| `surface` | `#FFFFFF` | Fondo de cards |
| `text` | `#1A2E25` | Texto principal |
| `textSecondary` | `#6B8C7A` | Texto secundario |
| `textDisabled` | `#9DB8AA` | Placeholders, texto inactivo |
| `border` | `#D4E6DC` | Bordes de inputs y cards |
| `error` | `#EF4444` | Errores, alertas altas |

Soporte de modo oscuro integrado — los colores cambian automáticamente según la preferencia del sistema.

### Fuentes

- **Montserrat ExtraBold**: títulos, números grandes, labels activos del tab bar, botones
- **Inter Regular**: cuerpo de texto, descripciones, placeholders

Cargadas con `expo-font` al inicio de la app.

---

## 10. Variables de entorno

```
EXPO_PUBLIC_API_URL=http://161.132.53.226/api/v1
```

Se configuran en `eas.json` por perfil de build:

| Perfil | `EXPO_PUBLIC_API_URL` | Tipo de build |
|---|---|---|
| `development` | `http://10.211.180.205:8000/api/v1` | APK debug con dev client |
| `preview` | `http://161.132.53.226/api/v1` | APK de prueba (distribución interna) |
| `production` | `https://api.sivapre.gob/api/v1` | AAB para Google Play Store |

Las variables `EXPO_PUBLIC_*` se hornearon en el bundle JavaScript en el momento del build — son visibles en el código compilado. No usar para secretos.

---

## 11. Construir el APK con EAS

### Requisitos

- Cuenta en [expo.dev](https://expo.dev)
- EAS CLI: `npm install -g eas-cli`
- Login: `eas login`

### APK de prueba (preview) — el que se usa actualmente

```bash
cd mobile

# Construir y subir a EAS
eas build --platform android --profile preview

# Al terminar, EAS muestra un enlace de descarga del .apk
# También se puede ver en: expo.dev/accounts/emmy_lopez/projects/sivapre/builds
```

### APK de producción (para Play Store)

```bash
eas build --platform android --profile production
# Genera un .aab (Android App Bundle)
```

### Cuándo reconstruir

| Cambio | ¿Rebuild necesario? |
|---|---|
| Cambio en código TypeScript | No (si se usa Expo OTA Updates) |
| Cambio en `EXPO_PUBLIC_API_URL` | **Sí** |
| Nuevo paquete nativo | **Sí** |
| Cambio en `app.json` (íconos, permisos, plugins) | **Sí** |

### Actualización OTA (sin rebuild)

Para cambios solo en código TypeScript, se puede publicar una actualización que los usuarios reciben la próxima vez que abren la app:

```bash
eas update --branch preview --message "descripción del cambio"
```
