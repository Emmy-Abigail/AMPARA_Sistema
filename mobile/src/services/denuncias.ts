import { api, BASE_URL } from './api';
import { storage, StorageKeys } from '../store/storage';
import type {
  Denuncia,
  CrearDenunciaPayload,
  ApiResponse,
  PaginatedResponse,
  MensajeCaso,
} from '../types';

export const denunciasService = {
  async subirFoto(uri: string): Promise<string> {
    const token = await storage.getItem(StorageKeys.AUTH_TOKEN);
    const formData = new FormData();
    formData.append('foto', { uri, name: 'evidencia.jpg', type: 'image/jpeg' } as any);
    const response = await fetch(`${BASE_URL}/denuncias/foto`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
      body: formData,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Error ${response.status}: ${text}`);
    }
    const json = (await response.json()) as ApiResponse<{ url: string }>;
    return json.data.url;
  },

  async subirAudio(uri: string): Promise<string> {
    const token = await storage.getItem(StorageKeys.AUTH_TOKEN);
    const formData = new FormData();
    formData.append('audio', { uri, name: 'audio.m4a', type: 'audio/mp4' } as any);
    const response = await fetch(`${BASE_URL}/denuncias/audio`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
      body: formData,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Error ${response.status}: ${text}`);
    }
    const json = (await response.json()) as ApiResponse<{ url: string }>;
    return json.data.url;
  },

  async crear(payload: CrearDenunciaPayload): Promise<Denuncia> {
    const { data } = await api.post<ApiResponse<Denuncia>>('/denuncias', payload);
    return data.data;
  },

  async crearRaw(payload: CrearDenunciaPayload): Promise<{ status: number; data: unknown }> {
    const resp = await api.post<ApiResponse<Denuncia>>('/denuncias', payload);
    return { status: resp.status, data: resp.data };
  },

  async listarMisDenuncias(pagina = 1, porPagina = 20): Promise<PaginatedResponse<Denuncia>> {
    const { data } = await api.get<ApiResponse<PaginatedResponse<Denuncia>>>(
      '/denuncias/mis-denuncias',
      { params: { pagina, porPagina } },
    );
    return data.data;
  },

  async obtenerPorId(id: string): Promise<Denuncia> {
    const { data } = await api.get<ApiResponse<Denuncia>>(`/denuncias/${id}`);
    return data.data;
  },

  async obtenerPorToken(token: string): Promise<Denuncia> {
    const { data } = await api.get<ApiResponse<Denuncia>>(`/denuncias/token/${token}`);
    return data.data;
  },

  async obtenerMensajes(denunciaId: string): Promise<MensajeCaso[]> {
    const { data } = await api.get<ApiResponse<MensajeCaso[]>>(
      `/denuncias/${denunciaId}/mensajes`,
    );
    return data.data;
  },

  async marcarMensajeLeido(mensajeId: string): Promise<void> {
    await api.patch(`/denuncias/mensajes/${mensajeId}/leer`);
  },
};
