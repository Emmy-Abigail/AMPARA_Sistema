import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage, StorageKeys } from '../store/storage';
import { triggerUnauthorized } from '../store/auth-signal';

const _apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!_apiUrl) {
  throw new Error(
    '[AMPARA] EXPO_PUBLIC_API_URL no está definida. ' +
    'Crea un archivo .env en mobile/ con EXPO_PUBLIC_API_URL=http://<host>/api/v1',
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

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await storage.getItem(StorageKeys.AUTH_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

async function _performRefresh(): Promise<string | null> {
  const refreshToken = await storage.getItem(StorageKeys.REFRESH_TOKEN);
  if (!refreshToken) return null;
  try {
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

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
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
      pendingQueue.forEach(({ resolve }) => resolve(newToken));
      pendingQueue = [];
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }

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
