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

// ─── Dominio — Denuncia ───────────────────────────────────────────────────────

export type TipoViolencia = 'Física' | 'Psicológica' | 'Sexual' | 'Económica' | 'Otra';

export type RelacionAgresor =
  | 'Cónyuge'
  | 'Expareja'
  | 'Familiar'
  | 'Conocido'
  | 'Desconocido';

export type NivelRiesgo = 'urgente' | 'alto' | 'moderado';

export type PreferenciaContacto = 'app' | 'llamada' | 'ninguno';

export type EstadoCaso =
  | 'nueva'
  | 'asignada'
  | 'en_seguimiento'
  | 'derivada'
  | 'pendiente_confirmacion'
  | 'cerrada';

export interface Denuncia {
  id: string;
  token_anonimo: string;
  tipo_violencia: TipoViolencia;
  relacion_agresor: RelacionAgresor;
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
  tipo_violencia: TipoViolencia;
  relacion_agresor: RelacionAgresor;
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
}

// ─── Mensajes operador ↔ víctima ──────────────────────────────────────────────

export interface MensajeCaso {
  id: string;
  denuncia_id: string;
  autor: 'operador' | 'sistema';
  contenido: string;
  destruir_al_leer: boolean;
  leido: boolean;
  created_at: string;
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
