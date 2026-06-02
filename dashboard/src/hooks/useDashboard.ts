import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../api/endpoints';
import type { Filtros } from '../types';

const keys = {
  kpis: (f: Partial<Filtros>) => ['kpis', f] as const,
  mapaReportes: (f: Partial<Filtros>) => ['mapa-reportes', f] as const,
  mapaNoti: (f: Partial<Filtros>) => ['mapa-noti', f] as const,
  mapaNetlab: (f: Partial<Filtros>) => ['mapa-netlab', f] as const,
  feed: (f: Partial<Filtros>, estado: string) => ['feed', f, estado] as const,
  feedAlertas: () => ['feed-alertas'] as const,
  tendencias: (f: Partial<Filtros>) => ['tendencias', f] as const,
  ubicaciones: ['ubicaciones'] as const,
};

const REFETCH_INTERVAL = 60_000; // 1 min

export function useKpis(filtros: Partial<Filtros>) {
  return useQuery({
    queryKey: keys.kpis(filtros),
    queryFn: () => dashboardApi.kpis(filtros),
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useMapaReportes(filtros: Partial<Filtros>) {
  return useQuery({
    queryKey: keys.mapaReportes(filtros),
    queryFn: () => dashboardApi.mapaReportes(filtros),
    staleTime: 30_000,
  });
}

export function useMapaNoti(filtros: Partial<Filtros>) {
  return useQuery({
    queryKey: keys.mapaNoti(filtros),
    queryFn: () => dashboardApi.mapaNoti(filtros),
    staleTime: 60_000,
  });
}

export function useMapaNetlab(filtros: Partial<Filtros>) {
  return useQuery({
    queryKey: keys.mapaNetlab(filtros),
    queryFn: () => dashboardApi.mapaNetlab(filtros),
    staleTime: 60_000,
  });
}

export function useFeed(filtros: Partial<Filtros>, estado?: string, limit = 30) {
  return useQuery({
    queryKey: keys.feed(filtros, estado ?? 'todos'),
    queryFn: () => dashboardApi.feed(filtros, limit, estado),
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useFeedAlertas() {
  return useQuery({
    queryKey: keys.feedAlertas(),
    queryFn: () => dashboardApi.feed({}, 50, 'enviado'),
    refetchInterval: 30_000,
  });
}

export function useTendencias(filtros: Partial<Filtros>) {
  return useQuery({
    queryKey: keys.tendencias(filtros),
    queryFn: () => dashboardApi.tendencias(filtros),
    staleTime: 5 * 60_000,
  });
}

export function useUbicaciones() {
  return useQuery({
    queryKey: keys.ubicaciones,
    queryFn: dashboardApi.ubicaciones,
    staleTime: Infinity,
  });
}

export function useActualizarEstado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) =>
      dashboardApi.actualizarEstado(id, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['mapa-reportes'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
    },
  });
}
