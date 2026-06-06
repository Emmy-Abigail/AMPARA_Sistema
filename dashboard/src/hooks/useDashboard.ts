// src - useDashboard.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../api/endpoints';
import type { EstadoCaso, Filtros } from '../types';

// ─── Intervalos de polling ────────────────────────────────────────────────────
const POLL_SLOW   = 60_000; // KPIs y mapa: 1 min
const POLL_NORMAL = 15_000; // Expedientes: 15 s
const POLL_SOS    = 10_000; // SOS: 10 s — alerta de emergencia

// ─── Query keys ───────────────────────────────────────────────────────────────

const keys = {
  kpis:        (f: Partial<Filtros>) => ['kpis', f]              as const,
  mapa:        ()                    => ['mapa']                  as const,
  denuncias:   (f: Partial<Filtros>, pagina: number) =>
                                        ['denuncias', f, pagina]  as const,
  operadores:  ()                    => ['operadores']             as const,
  mensajes:    (id: string)          => ['mensajes', id]           as const,
  sos:         ()                    => ['sos']                    as const,
};

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export function useKpis(filtros: Partial<Filtros>) {
  return useQuery({
    queryKey: keys.kpis(filtros),
    queryFn:  () => dashboardApi.kpis(filtros),
    refetchInterval: POLL_SLOW,
  });
}

// ─── Mapa ─────────────────────────────────────────────────────────────────────

export function useMapaDenuncias() {
  return useQuery({
    queryKey: keys.mapa(),
    queryFn:  dashboardApi.mapaDenuncias,
    staleTime: 30_000,
    refetchInterval: POLL_SLOW,
  });
}

// ─── Feed de denuncias ────────────────────────────────────────────────────────

export function useDenuncias(
  filtros: Partial<Filtros>,
  pagina = 1,
  porPagina = 30,
  soloActivas = false,
) {
  return useQuery({
    queryKey: [...keys.denuncias(filtros, pagina), soloActivas],
    queryFn:  () => dashboardApi.denuncias(filtros, pagina, porPagina, soloActivas),
    refetchInterval: POLL_NORMAL,
  });
}

// ─── Alertas SOS ──────────────────────────────────────────────────────────────

export function useSosAlertas() {
  return useQuery({
    queryKey: keys.sos(),
    queryFn:  dashboardApi.sosActivas,
    refetchInterval: POLL_SOS,
    staleTime: 5_000,
  });
}

export function useResolverSos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dashboardApi.resolverSos(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sos'] });
      qc.invalidateQueries({ queryKey: ['denuncias'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
    },
  });
}

export function useMarcarSosEnAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dashboardApi.sosEnAtencion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sos'] }),
  });
}

// ─── Operadores ───────────────────────────────────────────────────────────────

export function useOperadores() {
  return useQuery({
    queryKey: keys.operadores(),
    queryFn:  dashboardApi.operadores,
    staleTime: Infinity,
  });
}

// ─── Mutaciones ───────────────────────────────────────────────────────────────

export function useCambiarEstado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      estado,
      motivo_cierre,
    }: {
      id: string;
      estado: EstadoCaso;
      motivo_cierre?: string;
    }) => dashboardApi.cambiarEstado(id, estado, motivo_cierre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['denuncias'] });
      qc.invalidateQueries({ queryKey: ['mapa'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
    },
  });
}

export function useAsignarOperador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, operador_id }: { id: string; operador_id: string }) =>
      dashboardApi.asignarOperador(id, operador_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['denuncias'] });
      qc.invalidateQueries({ queryKey: ['kpis'] });
    },
  });
}

export function useMensajes(denunciaId: string, enabled = true) {
  return useQuery({
    queryKey: keys.mensajes(denunciaId),
    queryFn:  () => dashboardApi.getMensajes(denunciaId),
    enabled,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useSendMensaje() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      denunciaId,
      contenido,
      destruirAlLeer,
    }: {
      denunciaId: string;
      contenido: string;
      destruirAlLeer: boolean;
    }) => dashboardApi.sendMensaje(denunciaId, contenido, destruirAlLeer),
    onSuccess: (_data, { denunciaId }) => {
      qc.invalidateQueries({ queryKey: keys.mensajes(denunciaId) });
    },
  });
}
