import { api } from './api';
import type { ApiResponse } from '../types';

export interface SosAlertaParams {
  latitud?: number;
  longitud?: number;
  device_id?: string;
  denuncia_id?: string;
}

export interface SosAlertaResponse {
  id: string;
  estado: string;
  sms_enviados: number;
  fecha_activacion: string;
}

export async function activarSosAlerta(params: SosAlertaParams): Promise<SosAlertaResponse> {
  const { data } = await api.post<ApiResponse<SosAlertaResponse>>('/sos', params);
  return data.data;
}

export async function cancelarSosAlerta(alertaId: string): Promise<void> {
  await api.patch(`/sos/${alertaId}/resolver`);
}
