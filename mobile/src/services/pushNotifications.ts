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

export class PushSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PushSetupError';
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/FirebaseApp|FCM|fcm-credentials|google-services/i.test(msg)) {
      throw new PushSetupError(
        'Remote push needs Firebase (FCM) credentials on EAS. Local alerts after sync still work. See docs.expo.dev/push-notifications/fcm-credentials/'
      );
    }
    throw err;
  }
}

export async function enablePushAlerts() {
  try {
    const token = await registerForPushNotifications();
    await api.put('/settings/preferences', { pushAlertsEnabled: true });
    return token;
  } catch (err) {
    if (err instanceof PushSetupError) {
      // Still remember preference intent; remote push won't deliver until FCM is configured
      try {
        await api.put('/settings/preferences', { pushAlertsEnabled: true });
      } catch {
        // ignore
      }
    }
    throw err;
  }
}

export async function disablePushAlerts() {
  await api.put('/settings/preferences', { pushAlertsEnabled: false });
}

/** Local notification when foreground sync queues items (works without FCM) */
export async function notifyLocalDetected(count: number) {
  if (count <= 0) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('detected', {
        name: 'Detected transactions',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New transaction to review',
        body: count === 1 ? '1 item waiting in Detected' : `${count} items waiting in Detected`,
        data: { type: 'detected' },
      },
      trigger: null,
    });
  } catch {
    // ignore when notifications native path isn't ready
  }
}
