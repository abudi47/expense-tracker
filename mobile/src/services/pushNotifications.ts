import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('detected', {
      name: 'Detected transactions',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const id = projectId();
  const token = (
    await Notifications.getExpoPushTokenAsync(id ? { projectId: id } : undefined)
  ).data;

  try {
    await api.post('/settings/push-token', { token, enabled: true });
  } catch {
    // backend may not be redeployed yet
  }
  return token;
}

export async function enablePushAlerts() {
  const token = await registerForPushNotifications();
  await api.put('/settings/preferences', { pushAlertsEnabled: true });
  return token;
}

export async function disablePushAlerts() {
  await api.put('/settings/preferences', { pushAlertsEnabled: false });
}

/** Local notification when foreground sync queues items */
export async function notifyLocalDetected(count: number) {
  if (count <= 0) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New transaction to review',
        body: count === 1 ? '1 item waiting in Detected' : `${count} items waiting in Detected`,
        data: { type: 'detected' },
      },
      trigger: null,
    });
  } catch {
    // ignore on unsupported environments
  }
}
