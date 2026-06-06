import { api } from './api';
import { storage, StorageKeys } from '../store/storage';
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
  denuncia_id: string | null;
  latitud: number | null;
  longitud: number | null;
  fecha_activacion: string;
  fecha_resolucion: string | null;
}

export async function activarSosAlerta(params: SosAlertaParams): Promise<SosAlertaResponse> {
  const { data } = await api.post<ApiResponse<SosAlertaResponse>>('/sos', params);
  return data.data;
}

export async function cancelarSosAlerta(alertaId: string): Promise<void> {
  await api.patch(`/sos/${alertaId}/resolver`);
}

export async function listarMisAlertas(): Promise<SosAlertaResponse[]> {
  const deviceId = await storage.getItem(StorageKeys.DEVICE_ID);
  const { data } = await api.get<ApiResponse<SosAlertaResponse[]>>('/sos/mis-alertas', {
    headers: deviceId ? { 'X-Device-Id': deviceId } : {},
  });
  return data.data;
}
