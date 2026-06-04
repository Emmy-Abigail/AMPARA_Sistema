// Almacén local de casos enviados por esta usuaria.
// Clave intencionalmente no descriptiva para dificultar la detección.
// Guarda lo necesario para mostrar "Mis casos" sin necesidad de conexión.

import AsyncStorage from '@react-native-async-storage/async-storage';

const _STORE_KEY = '.a_cl_v1';

export interface CasoLocal {
  token_anonimo:    string;
  local_id:         string;
  tipo_violencia:   string;
  relacion_agresor: string;
  nivel_riesgo:     string;
  hay_heridos:      boolean;
  estado:           string;
  fecha_denuncia:   string;
  fecha_actualizacion: string;
  denuncia_id:      string | null;
  es_anonima:       boolean;
  foto_url:         string | null;  // URI local (file://) o URL del servidor
  descripcion:      string | null;
}

export async function guardarCasoLocal(
  caso: Omit<CasoLocal, 'estado' | 'denuncia_id' | 'fecha_actualizacion'>,
): Promise<void> {
  const lista    = await obtenerCasosLocales();
  const filtrada = lista.filter(c => c.local_id !== caso.local_id);
  const nuevo: CasoLocal = {
    ...caso,
    estado:              'nueva',
    denuncia_id:         null,
    fecha_actualizacion: caso.fecha_denuncia,
  };
  filtrada.unshift(nuevo);
  await AsyncStorage.setItem(_STORE_KEY, JSON.stringify(filtrada));
}

export async function obtenerCasosLocales(): Promise<CasoLocal[]> {
  try {
    const raw = await AsyncStorage.getItem(_STORE_KEY);
    return raw ? (JSON.parse(raw) as CasoLocal[]) : [];
  } catch {
    return [];
  }
}

export async function actualizarCasoLocal(localId: string, cambios: Partial<CasoLocal>): Promise<void> {
  const lista = await obtenerCasosLocales();
  const idx   = lista.findIndex(c => c.local_id === localId);
  if (idx !== -1) {
    lista[idx] = { ...lista[idx], ...cambios, fecha_actualizacion: new Date().toISOString() };
    await AsyncStorage.setItem(_STORE_KEY, JSON.stringify(lista));
  }
}
