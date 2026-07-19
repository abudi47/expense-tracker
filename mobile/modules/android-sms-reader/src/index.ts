import { Platform } from 'react-native';

export type SmsPayload = {
  messageId?: string;
  address?: string;
  body?: string;
  date?: number;
};

type NativeModule = {
  isSupported(): boolean;
  hasPermission(): boolean;
  scanRecent(limit: number): Promise<SmsPayload[]>;
  addListener(
    event: string,
    listener: (event: SmsPayload) => void
  ): { remove: () => void };
};

function getNative(): NativeModule | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo-modules-core');
    return requireNativeModule('AndroidSmsReader') as NativeModule;
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

export async function scanRecent(limit = 80): Promise<SmsPayload[]> {
  const Native = getNative();
  if (!Native?.scanRecent) {
    throw new Error('Native SMS module unavailable');
  }
  const rows = await Native.scanRecent(limit);
  return Array.isArray(rows) ? rows : [];
}

export function addSmsListener(listener: (event: SmsPayload) => void): { remove: () => void } {
  const Native = getNative();
  if (!Native?.addListener) {
    return { remove: () => {} };
  }
  return Native.addListener('onSmsReceived', listener);
}

export default {
  isSupported,
  hasPermission,
  scanRecent,
  addSmsListener,
};
