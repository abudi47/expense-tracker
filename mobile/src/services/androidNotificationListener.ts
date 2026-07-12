import { AppState, Platform } from 'react-native';
import { api } from './api';

type ListenerPayload = { title?: string; body?: string; packageName?: string };

let started = false;

type NativeApi = {
  isSupported: () => boolean;
  hasPermission: () => boolean;
  openNotificationListenerSettings: () => void;
  setAllowedPackages: (packages: string[]) => void;
  addNotificationListener: (
    listener: (n: ListenerPayload & { postTime?: number }) => void
  ) => { remove: () => void };
};

function loadNative(): NativeApi | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('android-notification-listener') as NativeApi;
  } catch {
    return null;
  }
}

export async function submitNotification(payload: ListenerPayload) {
  if (Platform.OS !== 'android') return null;
  return api.post<{ matched: boolean; item: unknown; outcome?: string }>(
    '/ingest/notification',
    payload
  );
}

export const FINANCE_PACKAGES = [
  'com.combanketh.mobilebanking',
  'com.bankofabyssinia.abo',
  'com.ethiotelecom.telebirr',
];

export function isNativeListenerAvailable() {
  return !!loadNative()?.isSupported?.();
}

export function hasNotificationListenerPermission() {
  return !!loadNative()?.hasPermission?.();
}

export function openSystemNotificationAccess() {
  const native = loadNative();
  if (native?.openNotificationListenerSettings) {
    native.openNotificationListenerSettings();
    return;
  }
}

/**
 * Start native hook if available. Safe no-op on iOS and Expo Go
 * without the native module (requires EAS rebuild).
 */
export function startAndroidNotificationBridge() {
  if (Platform.OS !== 'android' || started) return () => {};
  started = true;

  const native = loadNative();
  let sub: { remove: () => void } | undefined;

  if (native) {
    try {
      native.setAllowedPackages?.(FINANCE_PACKAGES);
      sub = native.addNotificationListener?.((n) => {
        submitNotification({
          title: n.title,
          body: n.body,
          packageName: n.packageName,
        }).catch(() => {});
      });
    } catch {
      // Expo Go
    }
  }

  const appSub = AppState.addEventListener('change', () => {});

  return () => {
    sub?.remove();
    appSub.remove();
    started = false;
  };
}
