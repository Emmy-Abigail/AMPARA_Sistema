import { api, BASE_URL } from './api';
import { storage, StorageKeys } from '../store/storage';
import type {
  Reporte,
  CrearReportePayload,
  ApiResponse,
  AlertasZonaResponse,
  PaginatedResponse,
} from '../types';

export const reportesService = {
  // fetch en lugar de axios para que React Native establezca automáticamente
  // el Content-Type: multipart/form-data con el boundary correcto.
  // axios con Content-Type por defecto en la instancia rompe el boundary.
  async subirFoto(uri: string): Promise<string> {
    const token = await storage.getItem(StorageKeys.AUTH_TOKEN);

    const formData = new FormData();
    formData.append('foto', { uri, name: 'foto.jpg', type: 'image/jpeg' } as any);

    const response = await fetch(`${BASE_URL}/reportes/foto`, {
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

  async crear(payload: CrearReportePayload): Promise<Reporte> {
    const { data } = await api.post<ApiResponse<Reporte>>('/reportes', payload);
    return data.data;
  },

  // Returns the raw axios response so the sync engine can record http_status
  // and server_response for observability without catching them itself.
  async crearRaw(payload: CrearReportePayload): Promise<{ status: number; data: unknown }> {
    const resp = await api.post<ApiResponse<Reporte>>('/reportes', payload);
    return { status: resp.status, data: resp.data };
  },

  async listarMisReportes(pagina = 1, porPagina = 20): Promise<PaginatedResponse<Reporte>> {
    const { data } = await api.get<ApiResponse<PaginatedResponse<Reporte>>>(
      '/reportes/mis-reportes',
      { params: { pagina, porPagina } },
    );
    return data.data;
  },

  async obtenerPorId(id: string): Promise<Reporte> {
    const { data } = await api.get<ApiResponse<Reporte>>(`/reportes/${id}`);
    return data.data;
  },

  async cancelar(id: string): Promise<Reporte> {
    const { data } = await api.patch<ApiResponse<Reporte>>(`/reportes/${id}/cancelar`);
    return data.data;
  },

  async obtenerAlertasZona(): Promise<AlertasZonaResponse> {
    const { data } = await api.get<AlertasZonaResponse>('/reportes/alertas-zona');
    return data;
  },
};
