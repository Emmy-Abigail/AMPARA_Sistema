// ─── Tema ─────────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

// ─── Autenticación ────────────────────────────────────────────────────────────

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  rol: 'usuario' | 'operador' | 'admin';
  creadoEn: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  usuario: Usuario;
}

export interface UpdatePerfilPayload {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  preferencia_contacto?: PreferenciaContacto;
  horario_contacto?: string;
}

export interface CambiarPasswordPayload {
  password_actual: string;
  password_nuevo: string;
}

// ─── Dominio — Violencia ──────────────────────────────────────────────────────

export type TipoViolencia =
  | 'Física'
  | 'Psicológica'
  | 'Verbal'
  | 'Sexual'
  | 'Económica'
  | 'Digital'
  | 'Otra'; // compat v1

export type RelacionAgresor =
  | 'Pareja o expareja'
  | 'Familiar'
  | 'Conocido/a'
  | 'Figura de autoridad'
  | 'Desconocido/a'
  // compat v1 — no se muestran en el formulario, solo en datos históricos
  | 'Cónyuge'
  | 'Expareja'
  | 'Conocido'
  | 'Desconocido';

export type FactorRiesgo =
  | 'amenazas_muerte'
  | 'acceso_armas'
  | 'violencia_escalando'
  | 'convive'
  | 'seguimiento_vigilancia'
  | 'orden_alejamiento_violada';

export type NivelRiesgo = 'urgente' | 'alto' | 'medio' | 'bajo' | 'moderado'; // 'moderado' compat v1

export type PreferenciaContacto = 'app' | 'llamada' | 'ninguno';

export type EstadoCaso =
  | 'nueva'
  | 'asignada'
  | 'en_seguimiento'
  | 'derivada'
  | 'pendiente_confirmacion'
  | 'cerrada';

// ─── Dominio — Denuncia ───────────────────────────────────────────────────────

export interface Denuncia {
  id: string;
  token_anonimo: string;
  codigo_acceso?: string;             // código corto amigable (6 chars) para seguimiento anónimo
  tipos_violencia: TipoViolencia[];   // v2 — array multi-select
  tipo_violencia?: TipoViolencia;     // v1 compat — puede estar ausente en nuevos registros
  relacion_agresor: RelacionAgresor;
  factores_riesgo?: FactorRiesgo[];
  nivel_riesgo: NivelRiesgo;
  hay_heridos: boolean;
  foto_url?: string;
  audio_url?: string;
  latitud?: number;
  longitud?: number;
  preferencia_contacto: PreferenciaContacto;
  horario_contacto?: string;
  descripcion?: string;
  es_anonima: boolean;
  estado: EstadoCaso;
  fecha_denuncia: string;
  fecha_actualizacion: string;
}

export interface CrearDenunciaPayload {
  tipos_violencia: TipoViolencia[];
  relacion_agresor: RelacionAgresor;
  factores_riesgo?: FactorRiesgo[];
  hay_heridos: boolean;
  foto_url?: string;
  audio_url?: string;
  latitud?: number;
  longitud?: number;
  preferencia_contacto: PreferenciaContacto;
  horario_contacto?: string;
  descripcion?: string;
  device_id?: string;
  local_id?: string;
  token_anonimo?: string;
  codigo_acceso?: string;
}

// ─── Mensajes operador ↔ víctima ──────────────────────────────────────────────

export interface MensajeCaso {
  id: string;
  denuncia_id: string;
  autor: 'operador' | 'sistema' | 'usuaria';
  contenido: string;
  destruir_al_leer: boolean;
  leido: boolean;
  created_at: string;
}

export interface ResponderMensajePayload {
  contenido: string;
  token_anonimo?: string;
}

// ─── SOS ──────────────────────────────────────────────────────────────────────

export interface SosAlertaPayload {
  latitud?: number;
  longitud?: number;
  denuncia_id?: string;
  device_id?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  mensaje?: string;
  exito: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface ApiError {
  mensaje: string;
  codigo?: string;
  errores?: Record<string, string[]>;
}

// ─── Navegación ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: { successMessage?: string } | undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Report: undefined;
  SOS: undefined;
  MyReports: undefined;
  Info: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  ReporteDetalle: { id: string };
  Perfil: undefined;
  EditarPerfil: undefined;
  CambiarPassword: undefined;
};
