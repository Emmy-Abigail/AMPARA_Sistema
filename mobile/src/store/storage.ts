import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Claves que contienen credenciales de sesión — se guardan en SecureStore
// (iOS Keychain / Android Keystore), cifrado por el SO.
// El resto va en AsyncStorage (preferencias, no sensibles).
//
// Por qué SecureStore para tokens:
// AsyncStorage en Android es texto plano en /data/data/[app]/. Un dispositivo
// rooteado puede leerlo sin permisos. SecureStore usa el keystore del hardware.
const SECURE_KEYS = new Set<string>(['auth_token', 'refresh_token', 'user_data']);

export const StorageKeys = {
  THEME_MODE: 'theme_mode',
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  NOTIF_ALERTAS: 'notif_alertas',
  NOTIF_ESTADO_REPORTE: 'notif_estado_reporte',
  DEVICE_ID: 'sivapre_device_id',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export const storage = {
  async getItem(key: StorageKey): Promise<string | null> {
    if (SECURE_KEYS.has(key)) {
      return SecureStore.getItemAsync(key);
    }
    return AsyncStorage.getItem(key);
  },

  async setItem(key: StorageKey, value: string): Promise<void> {
    if (SECURE_KEYS.has(key)) {
      return SecureStore.setItemAsync(key, value);
    }
    return AsyncStorage.setItem(key, value);
  },

  async removeItem(key: StorageKey): Promise<void> {
    if (SECURE_KEYS.has(key)) {
      return SecureStore.deleteItemAsync(key);
    }
    return AsyncStorage.removeItem(key);
  },
};
