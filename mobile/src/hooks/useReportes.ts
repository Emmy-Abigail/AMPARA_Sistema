// useReportes.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportesService } from '../services/reportes';
import type { CrearReportePayload } from '../types';

export const reportesKeys = {
  all: ['reportes'] as const,
  mis: () => [...reportesKeys.all, 'mis-reportes'] as const,
  detalle: (id: string) => [...reportesKeys.all, 'detalle', id] as const,
  alertasZona: () => [...reportesKeys.all, 'alertas-zona'] as const,
};

export function useMisReportes(pagina = 1) {
  return useQuery({
    queryKey: reportesKeys.mis(),
    queryFn: () => reportesService.listarMisReportes(pagina),
  });
}

export function useReporte(id: string) {
  return useQuery({
    queryKey: reportesKeys.detalle(id),
    queryFn: () => reportesService.obtenerPorId(id),
    enabled: !!id,
  });
}

export function useCrearReporte() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CrearReportePayload) =>
      reportesService.crear(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportesKeys.mis() });
    },
  });
}

export function useAlertasZona() {
  return useQuery({
    queryKey: reportesKeys.alertasZona(),
    queryFn: () => reportesService.obtenerAlertasZona(),
    staleTime: 1000 * 60 * 5,   // 5 min — las alertas no cambian cada segundo
    retry: 1,
  });
}

export function useCancelarReporte() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reportesService.cancelar(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: reportesKeys.mis() });
      queryClient.invalidateQueries({ queryKey: reportesKeys.detalle(id) });
    },
  });
}
