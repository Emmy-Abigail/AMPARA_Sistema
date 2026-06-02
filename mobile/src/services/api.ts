// services - api.ts

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage, StorageKeys } from '../store/storage';
import { triggerUnauthorized } from '../store/auth-signal';

// EXPO_PUBLIC_API_URL se inyecta en tiempo de compilación por EAS (eas.json → env).
// Si no está definida, la build está mal configurada — falla explícitamente
// en lugar de conectarse silenciosamente a una IP de desarrollo que no existe.
const _apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!_apiUrl) {
  throw new Error(
    '[SIVAPRE] EXPO_PUBLIC_API_URL no está definida. ' +
    'Revisa el perfil de EAS en eas.json o crea un archivo .env en mobile/.',
  );
}
export const BASE_URL = _apiUrl;

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Adjunta el token JWT en cada petición autenticada
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await storage.getItem(StorageKeys.AUTH_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Refresh silencioso ───────────────────────────────────────────────────────
//
// Cuando el access token expira (30 min), en lugar de hacer logout inmediato:
// 1. Tomamos el refresh token del storage.
// 2. Pedimos un nuevo par (access, refresh) al backend.
// 3. Reintentamos la petición original con el nuevo token.
//
// Si el refresh también falla (expiró, fue revocado), ahí sí se hace logout.
// Todo esto es invisible para el usuario — no ve ningún error ni pantalla de login
// mientras tenga una sesión activa de menos de 30 días.
//
// El flag "isRefreshing" y la cola "pendingQueue" evitan que múltiples requests
// simultáneos (que todas fallan con 401 al mismo tiempo) generen múltiples llamadas
// al endpoint /refresh. Solo se hace un refresh; los demás esperan en la cola.

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

async function _performRefresh(): Promise<string | null> {
  const refreshToken = await storage.getItem(StorageKeys.REFRESH_TOKEN);
  if (!refreshToken) return null;

  try {
    // Usa axios directamente, NO la instancia `api`, para no re-activar este interceptor.
    const { data } = await axios.post<{ token: string; refreshToken: string }>(
      `${BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { timeout: 10_000 },
    );
    await Promise.all([
      storage.setItem(StorageKeys.AUTH_TOKEN, data.token),
      storage.setItem(StorageKeys.REFRESH_TOKEN, data.refreshToken),
    ]);
    return data.token;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Solo interceptamos 401 no reintentados. Cualquier otro error pasa directo.
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Ya hay un refresh en vuelo — agregar a la cola y esperar el resultado.
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    const newToken = await _performRefresh();
    isRefreshing = false;

    if (newToken) {
      // Refresh exitoso: desencolar peticiones pendientes y reintentar la original.
      pendingQueue.forEach(({ resolve }) => resolve(newToken));
      pendingQueue = [];
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }

    // Refresh fallido: limpiar cola y hacer logout.
    pendingQueue.forEach(({ reject }) => reject(error));
    pendingQueue = [];
    await Promise.all([
      storage.removeItem(StorageKeys.AUTH_TOKEN),
      storage.removeItem(StorageKeys.REFRESH_TOKEN),
      storage.removeItem(StorageKeys.USER_DATA),
    ]);
    triggerUnauthorized();
    return Promise.reject(error);
  },
);
