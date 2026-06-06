// dashboard - src - api - endpoints.ts
import { api } from './client';
import type {
  ApiResponse,
  PaginatedData,
  KpisData,
  Denuncia,
  DenunciaMapa,
  MensajeResponse,
  Operador,
  AlertaSos,
  Filtros,
  EstadoCaso,
} from '../types';

// Construye query params solo con los valores presentes
function toParams(f: Partial<Filtros>): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.fecha_desde)    p.fecha_desde    = f.fecha_desde;
  if (f.fecha_hasta)    p.fecha_hasta    = f.fecha_hasta;
  if (f.estado)         p.estado         = f.estado;
  if (f.nivel_riesgo)   p.nivel_riesgo   = f.nivel_riesgo;
  if (f.tipo_violencia) p.tipo_violencia = f.tipo_violencia;
  return p;
}

export const dashboardApi = {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  // GET /dashboard/stats → ApiResponse<KpisData>
  kpis: (f: Partial<Filtros>) =>
    api
      .get<ApiResponse<KpisData>>('/dashboard/stats', { params: toParams(f) })
      .then((r) => r.data.data),

  // ─── Mapa ──────────────────────────────────────────────────────────────────
  // GET /dashboard/mapa → ApiResponse<DenunciaMapa[]>
  mapaDenuncias: () =>
    api
      .get<ApiResponse<DenunciaMapa[]>>('/dashboard/mapa')
      .then((r) => r.data.data),

  // ─── Feed / listado de denuncias ──────────────────────────────────────────
  // GET /dashboard/denuncias → ApiResponse<PaginatedData<Denuncia>>
  denuncias: (
    f: Partial<Filtros>,
    pagina = 1,
    porPagina = 30,
    soloActivas = false,
  ) =>
    api
      .get<ApiResponse<PaginatedData<Denuncia>>>('/dashboard/denuncias', {
        params: {
          ...toParams(f),
          pagina,
          porPagina,
          ...(soloActivas ? { solo_activas: true } : {}),
        },
      })
      .then((r) => r.data.data),

  // ─── Acciones sobre una denuncia ──────────────────────────────────────────
  // PATCH /dashboard/denuncias/:id/estado
  cambiarEstado: (id: string, estado: EstadoCaso, motivo_cierre?: string) =>
    api
      .patch<ApiResponse<Denuncia>>(`/dashboard/denuncias/${id}/estado`, {
        estado,
        motivo_cierre,
      })
      .then((r) => r.data.data),

  // PATCH /dashboard/denuncias/:id/asignar
  asignarOperador: (id: string, operador_id: string) =>
    api
      .patch<ApiResponse<Denuncia>>(`/dashboard/denuncias/${id}/asignar`, {
        operador_id,
      })
      .then((r) => r.data.data),

  // ─── Operadores ───────────────────────────────────────────────────────────
  // GET /dashboard/operadores
  operadores: () =>
    api
      .get<ApiResponse<Operador[]>>('/dashboard/operadores')
      .then((r) => r.data.data),

  // ─── Mensajes ─────────────────────────────────────────────────────────────
  // GET /denuncias/:id/mensajes — hilo completo (operador + víctima)
  getMensajes: (denunciaId: string) =>
    api
      .get<ApiResponse<MensajeResponse[]>>(`/denuncias/${denunciaId}/mensajes`)
      .then((r) => r.data.data),

  // ─── SOS ──────────────────────────────────────────────────────────────────
  sosActivas: () =>
    api
      .get<ApiResponse<AlertaSos[]>>('/dashboard/sos')
      .then((r) => r.data.data),

  resolverSos: (id: string) =>
    api.patch(`/dashboard/sos/${id}/resolver`),

  // POST /dashboard/denuncias/:id/mensajes
  sendMensaje: (denunciaId: string, contenido: string, destruirAlLeer: boolean) =>
    api
      .post<ApiResponse<MensajeResponse>>(`/dashboard/denuncias/${denunciaId}/mensajes`, {
        contenido,
        destruir_al_leer: destruirAlLeer,
      })
      .then((r) => r.data.data),
};
