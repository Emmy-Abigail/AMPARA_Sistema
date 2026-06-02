import { api } from './client';
import type { Filtros, KpisData, ReporteMapa, NotiMapa, NetlabMapa, FeedItem, TendenciasData } from '../types';

function toParams(f: Partial<Filtros>) {
  const p: Record<string, string> = {};
  if (f.fecha_desde) p.fecha_desde = f.fecha_desde;
  if (f.fecha_hasta) p.fecha_hasta = f.fecha_hasta;
  if (f.departamento) p.departamento = f.departamento;
  if (f.provincia) p.provincia = f.provincia;
  if (f.distrito) p.distrito = f.distrito;
  return p;
}

export const dashboardApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  kpis: (f: Partial<Filtros>) =>
    api.get<KpisData>('/dashboard/kpis', { params: toParams(f) }).then((r) => r.data),

  mapaReportes: (f: Partial<Filtros>) =>
    api.get<ReporteMapa[]>('/dashboard/mapa/reportes', { params: toParams(f) }).then((r) => r.data),

  mapaNoti: (f: Partial<Filtros>) =>
    api.get<NotiMapa[]>('/dashboard/mapa/noti', { params: toParams(f) }).then((r) => r.data),

  mapaNetlab: (f: Partial<Filtros>) =>
    api.get<NetlabMapa[]>('/dashboard/mapa/netlab', { params: toParams(f) }).then((r) => r.data),

  feed: (f: Partial<Filtros>, limit = 30, estado?: string) =>
    api.get<FeedItem[]>('/dashboard/feed', {
      params: { ...toParams(f), limit, ...(estado ? { estado } : {}) },
    }).then((r) => r.data),

  tendencias: (f: Partial<Filtros>) =>
    api.get<TendenciasData>('/dashboard/tendencias', { params: toParams(f) }).then((r) => r.data),

  ubicaciones: () =>
    api.get<{ departamentos: string[] }>('/dashboard/ubicaciones').then((r) => r.data),

  actualizarEstado: (id: string, estado: string) =>
    api.patch(`/dashboard/reportes/${id}/estado`, { estado }).then((r) => r.data),
};
