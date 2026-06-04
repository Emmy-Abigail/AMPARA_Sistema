# Ampara — Dashboard Web

Panel de gestión para operadores y administradores del sistema Ampara.

## Stack

- **React 18** + **TypeScript**
- **Vite** — bundler y servidor de desarrollo
- **Leaflet** — mapa interactivo de denuncias
- **Redux Toolkit** — estado global
- **React Router v6** — navegación

## Desarrollo local

```bash
npm install
npm run dev   # http://localhost:3000
```

Requiere que el backend esté corriendo en `http://localhost:8000`. Ver el [README raíz](../README.md) para levantar el entorno completo con Docker.

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Vista previa del build de producción |
| `npm run lint` | Revisión de código con ESLint |

## Variables de entorno

Crear un archivo `.env.local` en esta carpeta:

```env
VITE_API_URL=http://localhost:8000
```

En producción, nginx sirve el `dist/` y el proxy `/api/*` apunta al backend.
