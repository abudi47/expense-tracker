import { Platform } from 'react-native';

type NotificationPayload = {
  title?: string;
  body?: string;
  packageName?: string;
  postTime?: number;
};

type NativeModule = {
  isSupported(): boolean;
  hasPermission(): boolean;
  openSettings(): void;
  setAllowedPackages(packages: string[]): void;
  addListener(
    event: string,
    listener: (event: NotificationPayload) => void
  ): { remove: () => void };
};

function getNative(): NativeModule | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo-modules-core');
    return requireNativeModule('AndroidNotificationListener') as NativeModule;
  } catch {
    return null;
  }
}

export function isSupported(): boolean {
  const Native = getNative();
  try {
    return !!Native?.isSupported?.();
  } catch {
    return false;
  }
}

export function hasPermission(): boolean {
  const Native = getNative();
  try {
    return !!Native?.hasPermission?.();
  } catch {
    return false;
  }
}

export function openNotificationListenerSettings() {
  getNative()?.openSettings?.();
}

export function setAllowedPackages(packages: string[]) {
  getNative()?.setAllowedPackages?.(packages);
}

export function addNotificationListener(
  listener: (event: NotificationPayload) => void
): { remove: () => void } {
  const Native = getNative();
  if (!Native?.addListener) {
    return { remove: () => {} };
  }
  return Native.addListener('onNotificationReceived', listener);
}

export default {
  isSupported,
  hasPermission,
  openNotificationListenerSettings,
  setAllowedPackages,
  addNotificationListener,
};
