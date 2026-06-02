import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

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
    // expo-notifications no disponible
  }
}

export async function registrarPushToken(): Promise<void> {
  if (!Device.isDevice || isExpoGo) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('denuncias', {
      name: 'Estado de casos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
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

  if (!projectId) return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/auth/push-token', { token: tokenData.data });
  } catch {
    // Falla silenciosamente — push no es crítico para la app
  }
}
