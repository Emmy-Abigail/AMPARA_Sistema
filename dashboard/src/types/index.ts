// ─── Enums (espejo de app/schemas/enums.py) ───────────────────────────────────

export type TipoViolencia = 'Física' | 'Psicológica' | 'Verbal' | 'Sexual' | 'Económica' | 'Digital' | 'Otra';
export type RelacionAgresor = 'Pareja o expareja' | 'Familiar' | 'Conocido/a' | 'Figura de autoridad' | 'Desconocido/a'
  | 'Cónyuge' | 'Expareja' | 'Conocido' | 'Desconocido'; // compat v1
export type NivelRiesgo = 'urgente' | 'alto' | 'medio' | 'bajo' | 'moderado';
export type PreferenciaContacto = 'app' | 'llamada' | 'ninguno';
export type EstadoCaso =
  | 'nueva'
  | 'asignada'
  | 'en_seguimiento'
  | 'derivada'
  | 'pendiente_confirmacion'
  | 'cerrada';

// ─── Respuesta envuelta de la API ─────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  exito: boolean;
  mensaje: string | null;
}

export interface PaginatedData<T> {
  data: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export interface KpisData {
  total: number;
  activas: number;
  urgentes: number;
  hoy: number;
  por_estado: Record<EstadoCaso, number>;
  por_tipo: Record<TipoViolencia, number>;
  tendencia: { fecha: string; total: number }[];
}

// ─── Denuncia ─────────────────────────────────────────────────────────────────

export interface Denuncia {
  id: string;
  token_anonimo: string;
  codigo_acceso?: string;
  tipos_violencia?: TipoViolencia[];
  tipo_violencia: TipoViolencia;
  relacion_agresor: RelacionAgresor;
  factores_riesgo?: string[];
  nivel_riesgo: NivelRiesgo;
  hay_heridos: boolean;
  descripcion?: string | null;
  foto_url: string | null;
  audio_url: string | null;
  latitud: number | null;
  longitud: number | null;
  preferencia_contacto: PreferenciaContacto;
  horario_contacto: string | null;
  es_anonima: boolean;
  estado: EstadoCaso;
  fecha_denuncia: string;
  fecha_actualizacion: string;
}

// ─── Mapa ─────────────────────────────────────────────────────────────────────

export interface DenunciaMapa {
  id: string;
  lat: number;
  lng: number;
  nivel_riesgo: NivelRiesgo;
  tipo_violencia: TipoViolencia;
  hay_heridos: boolean;
  estado: EstadoCaso;
}

// ─── Alerta SOS ───────────────────────────────────────────────────────────────

export interface AlertaSos {
  id: string;
  usuario_nombre: string | null;
  latitud: number | null;
  longitud: number | null;
  sms_enviados: number;
  fecha_activacion: string;
  denuncia_id: string | null;
}

// ─── Operadores ───────────────────────────────────────────────────────────────

export interface Operador {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

// ─── Mensaje operador ↔ víctima ───────────────────────────────────────────────

export interface MensajeResponse {
  id: string;
  denuncia_id: string;
  autor: 'operador' | 'sistema' | 'usuaria';
  contenido: string;
  destruir_al_leer: boolean;
  leido: boolean;
  created_at: string;
}

// ─── Filtros del dashboard ────────────────────────────────────────────────────

export interface Filtros {
  fecha_desde: string;
  fecha_hasta: string;
  estado: EstadoCaso;
  nivel_riesgo: NivelRiesgo;
  tipo_violencia: TipoViolencia;
}
