import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const SECURE_KEYS = new Set<string>(['auth_token', 'refresh_token', 'user_data']);

export const StorageKeys = {
  THEME_MODE:           'theme_mode',
  AUTH_TOKEN:           'auth_token',
  REFRESH_TOKEN:        'refresh_token',
  USER_DATA:            'user_data',
  DEVICE_ID:            'ampara_device_id',
  GUEST_MODE:           'ampara_guest_mode',
  NOTIF_CASOS:          'notif_casos',
  NOTIF_MENSAJES:       'notif_mensajes',
  NOTIF_SILENCIOSO:     'notif_silencioso',     // Modo silencioso total
  TRUSTED_CONTACT:      'trusted_contact',      // Nombre + número de contacto de confianza
  // Clave intencionalmente genérica para no revelar la app
  MSG_CACHE:            '.a_mc_v1',             // Caché de mensajes del operador
  ICONO_CAMUFLAJE:      'icono_camuflaje',      // 'default' | 'calculator' | 'notes' | 'weather'
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export const storage = {
  async getItem(key: StorageKey): Promise<string | null> {
    if (SECURE_KEYS.has(key)) return SecureStore.getItemAsync(key);
    return AsyncStorage.getItem(key);
  },
  async setItem(key: StorageKey, value: string): Promise<void> {
    if (SECURE_KEYS.has(key)) return SecureStore.setItemAsync(key, value);
    return AsyncStorage.setItem(key, value);
  },
  async removeItem(key: StorageKey): Promise<void> {
    if (SECURE_KEYS.has(key)) return SecureStore.deleteItemAsync(key);
    return AsyncStorage.removeItem(key);
  },
};
