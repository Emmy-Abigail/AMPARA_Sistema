import axios from 'axios';

import { api, BASE_URL } from './api';
import { storage, StorageKeys } from '../store/storage';
import type {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  UpdatePerfilPayload,
  CambiarPasswordPayload,
  Usuario,
  ApiResponse,
} from '../types';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    await _persistSession(data);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    // No persiste sesión: el usuario debe iniciar sesión manualmente
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      await Promise.all([
        storage.removeItem(StorageKeys.AUTH_TOKEN),
        storage.removeItem(StorageKeys.REFRESH_TOKEN),
        storage.removeItem(StorageKeys.USER_DATA),
      ]);
    }
  },

  async updatePerfil(payload: UpdatePerfilPayload): Promise<ApiResponse<Usuario>> {
    const { data } = await api.patch<ApiResponse<Usuario>>('/auth/perfil', payload);
    await storage.setItem(StorageKeys.USER_DATA, JSON.stringify(data.data));
    return data;
  },

  async changePassword(payload: CambiarPasswordPayload): Promise<void> {
    await api.post('/auth/perfil/password', payload);
  },

  async getToken(): Promise<string | null> {
    return storage.getItem(StorageKeys.AUTH_TOKEN);
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await storage.getItem(StorageKeys.AUTH_TOKEN);
    return !!token;
  },

  /**
   * Renueva el access token usando el refresh token almacenado.
   *
   * Usa axios directamente (NO la instancia `api`) para evitar
   * que el interceptor de 401 se active en cadena sobre este mismo request.
   *
   * Retorna true si el refresh fue exitoso, false si hay que hacer logout.
   */
  async refreshSession(): Promise<boolean> {
    const refreshToken = await storage.getItem(StorageKeys.REFRESH_TOKEN);
    if (!refreshToken) return false;

    try {
      const { data } = await axios.post<AuthResponse>(
        `${BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        { timeout: 10_000 },
      );
      await Promise.all([
        storage.setItem(StorageKeys.AUTH_TOKEN, data.token),
        storage.setItem(StorageKeys.REFRESH_TOKEN, data.refreshToken),
      ]);
      return true;
    } catch {
      return false;
    }
  },
};

async function _persistSession(authData: AuthResponse) {
  await Promise.all([
    storage.setItem(StorageKeys.AUTH_TOKEN, authData.token),
    storage.setItem(StorageKeys.REFRESH_TOKEN, authData.refreshToken),
    storage.setItem(StorageKeys.USER_DATA, JSON.stringify(authData.usuario)),
  ]);
}
