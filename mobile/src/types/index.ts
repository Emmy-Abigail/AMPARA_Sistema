// types - index.ts

// ─── Tema ────────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

// ─── Autenticación ───────────────────────────────────────────────────────────

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  rol: 'ciudadano' | 'inspector' | 'admin';
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
  departamento?: string;
  provincia?: string;
  distrito?: string;
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
  departamento?: string;
  provincia?: string;
  distrito?: string;
}

export interface CambiarPasswordPayload {
  password_actual: string;
  password_nuevo: string;
}

// ─── Alertas por zona ────────────────────────────────────────────────────────

export type NivelAlerta = 'Alto' | 'Medio' | 'Bajo';

export interface AlertaZona {
  zona: string;
  departamento: string;
  provincia: string;
  nivel: NivelAlerta;
  descripcion: string;
  total_reportes: number;
  es_mi_zona: boolean;
}

export interface AlertasZonaResponse {
  alertas: AlertaZona[];
  tiene_zona: boolean;
}

// ─── Reportes ────────────────────────────────────────────────────────────────

export type EstadoReporte = 'enviado' | 'en_revision' | 'resuelto' | 'rechazado';

export type TipoLugar = 'Vivienda' | 'Vía Pública' | 'Terreno Abandonado' | 'Mercado' | 'Colegio' | 'Otro';
export type TipoObjeto = 'Llantas' | 'Baldes' | 'Plantas' | 'Botellas' | 'Canales' | 'Otro';
export type ObservaLarvas = 'Sí, claramente' | 'No estoy seguro' | 'No';
export type ConocimientoDengue = 'Sí' | 'No lo sé' | 'No';

export interface Reporte {
  id: string;
  usuario_id: string;
  latitud: number;
  longitud: number;
  foto_url?: string;
  tipo_lugar: TipoLugar;
  tipo_objeto: TipoObjeto;
  observa_larvas: ObservaLarvas;
  conocimiento_dengue_cercano?: ConocimientoDengue;
  comentarios?: string;
  estado: EstadoReporte;
  fecha_reporte: string;
  fecha_actualizacion: string;
}

export interface CrearReportePayload {
  latitud: number;
  longitud: number;
  foto_url?: string;
  tipo_lugar: TipoLugar;
  tipo_objeto: TipoObjeto;
  observa_larvas: ObservaLarvas;
  conocimiento_dengue_cercano?: ConocimientoDengue;
  comentarios?: string;
  // Campos de idempotencia: permiten reintentar el envío sin crear duplicados.
  // device_id: UUID persistente del dispositivo, generado en la primera instalación.
  // local_id:  UUID único por reporte, generado en el momento de crearlo.
  device_id?: string;
  local_id?: string;
  direccion?: string;
}


// ─── API ─────────────────────────────────────────────────────────────────────

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

// ─── Navegación ──────────────────────────────────────────────────────────────

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
