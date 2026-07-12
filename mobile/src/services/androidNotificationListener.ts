import { AppState, Platform } from 'react-native';
import { api } from './api';

/**
 * Bridges Android Notification Listener → backend ingest.
 * Full native binding requires a custom/dev client with a notification-listener
 * module. Until linked, this service still exposes `submitNotification` for
 * manual/test and future native callbacks.
 */
type ListenerPayload = { title?: string; body?: string; packageName?: string };

let started = false;

export async function submitNotification(payload: ListenerPayload) {
  if (Platform.OS !== 'android') return null;
  return api.post<{ matched: boolean; item: unknown }>('/ingest/notification', payload);
}

/** Known finance packages we care about when a native listener is present */
export const FINANCE_PACKAGES = [
  'com.combanketh.mobilebanking',
  'com.bankofabyssinia.abo',
  'com.ethiotelecom.telebirr',
];

/**
 * Start polling / native hook if available. Safe no-op on iOS and Expo Go
 * without the native module.
 */
export function startAndroidNotificationBridge() {
  if (Platform.OS !== 'android' || started) return () => {};
  started = true;

  const NativeListener = (global as { AndroidNotificationListener?: {
    onNotification?: (cb: (n: ListenerPayload) => void) => { remove: () => void };
  } }).AndroidNotificationListener;

  let sub: { remove: () => void } | undefined;
  if (NativeListener?.onNotification) {
    sub = NativeListener.onNotification((n) => {
      submitNotification(n).catch(() => {});
    });
  }

  const appSub = AppState.addEventListener('change', () => {
    // Placeholder for re-check of listener permission when returning from Settings
  });

  return () => {
    sub?.remove();
    appSub.remove();
    started = false;
  };
}
