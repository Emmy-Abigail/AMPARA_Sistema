import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

// Remote push notifications were removed from Expo Go in SDK 53.
// Running in a development build or standalone app is required.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

export function initNotificationHandler(): void {
  if (isExpoGo) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // expo-notifications no disponible (sin plugin configurado)
  }
}

export async function registrarPushToken(): Promise<void> {
  if (!Device.isDevice || isExpoGo) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reportes', {
      name: 'Estado de reportes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F6E56',
      sound: 'default',
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

  if (!projectId) {
    console.error('[Push] projectId no disponible — verifica app.json extra.eas.projectId');
    return;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/auth/push-token', { token: tokenData.data });
  } catch (err) {
    console.error('[Push] Error al registrar token:', err);
  }
}
