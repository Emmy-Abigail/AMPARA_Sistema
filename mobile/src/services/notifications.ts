import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';
import { storage, StorageKeys } from '../store/storage';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export function initNotificationHandler(): void {
  if (isExpoGo) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => {
        const silencioso = await storage.getItem(StorageKeys.NOTIF_SILENCIOSO);
        // Modo silencioso total: sin ninguna señal visible o sonora en ningún estado de la app.
        if (silencioso === 'true') {
          return {
            shouldShowAlert:  false,
            shouldPlaySound:  false,
            shouldSetBadge:   false,
            shouldShowBanner: false,
            shouldShowList:   false,
          };
        }
        // Comportamiento normal: sin sonido ni banner, solo badge + lista del sistema.
        return {
          shouldShowAlert:  false,
          shouldPlaySound:  false,
          shouldSetBadge:   true,
          shouldShowBanner: false,
          shouldShowList:   true,
        };
      },
    });
  } catch {
    // expo-notifications no disponible
  }
}

export async function registrarPushToken(): Promise<void> {
  if (!Device.isDevice || isExpoGo) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('denuncias', {
      name: 'Ampara',
      importance: Notifications.AndroidImportance.DEFAULT, // No HIGH — evita preview en lock screen
      vibrationPattern: [0, 150],                          // 1 pulso corto de 150ms
      sound: null,                                         // Sin sonido
      // PRIVATE oculta el contenido en la pantalla bloqueada; solo muestra "Ampara"
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      bypassDnd: false,
      enableVibrate: true,
      showBadge: true,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const projectId =
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
    Constants.easConfig?.projectId;

  if (!projectId) return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/auth/push-token', { token: tokenData.data });
  } catch {
    // Falla silenciosamente — push no es crítico para la app
  }
}
