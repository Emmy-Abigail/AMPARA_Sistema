export interface KpisData {
  total_reportes: number;
  reportes_con_larvas: number;
  casos_sospechosos: number;
  casos_confirmados: number;
}

export interface ReporteMapa {
  id: string;
  lat: number;
  lng: number;
  tipo_lugar: string;
  tipo_objeto: string;
  observa_larvas: string;
  estado: string;
  foto_url: string | null;
  comentarios: string | null;
  direccion: string | null;
  fecha_reporte: string;
  reporter: { nombre: string; departamento: string; provincia: string; distrito: string };
}

export interface NotiMapa {
  departamento: string;
  provincia: string;
  ubigeo: string;
  tipo_diagnostico: string;
  total: number;
}

export interface NetlabMapa {
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  serotipo: string | null;
  total: number;
}

export interface FeedItem {
  id: string;
  tipo_lugar: string;
  tipo_objeto: string;
  observa_larvas: string;
  conocimiento_dengue_cercano: string | null;
  comentarios: string | null;
  estado: string;
  foto_url: string | null;
  lat: number;
  lng: number;
  direccion: string | null;
  fecha_reporte: string;
  fecha_actualizacion: string;
  reporter: { nombre: string; email: string; departamento: string; provincia: string; distrito: string };
  last_actor: { nombre: string | null; email: string } | null;
}

export interface TendenciasData {
  reportes: { semana: string; total: number }[];
  noti: { ano: number; semana_epi: number; total: number }[];
  netlab: { semana: string; total: number }[];
}

export interface Filtros {
  fecha_desde: string;
  fecha_hasta: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

export type EstadoReporte = 'enviado' | 'en_revision' | 'resuelto' | 'rechazado' | 'cancelado';
