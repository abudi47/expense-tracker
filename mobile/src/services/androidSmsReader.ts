import { AppState, PermissionsAndroid, Platform, type AppStateStatus } from 'react-native';
import { api } from './api';

export type SmsPayload = {
  messageId?: string;
  address?: string;
  body?: string;
  date?: number;
};

type NativeApi = {
  isSupported: () => boolean;
  hasPermission: () => boolean;
  scanRecent: (limit: number) => Promise<SmsPayload[]>;
  addSmsListener: (listener: (n: SmsPayload) => void) => { remove: () => void };
};

let started = false;
let lastScanAt = 0;

function loadNative(): NativeApi | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('android-sms-reader') as NativeApi;
  } catch {
    return null;
  }
}

export function isNativeSmsReaderAvailable() {
  return !!loadNative()?.isSupported?.();
}

export function hasSmsPermission() {
  const native = loadNative();
  try {
    return !!native?.hasPermission?.();
  } catch {
    return false;
  }
}

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);
    const readOk =
      result[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
    return readOk;
  } catch {
    return false;
  }
}

export async function submitSms(payload: SmsPayload) {
  if (Platform.OS !== 'android' || !payload.body) return null;
  return api.post<{ matched: boolean; item: unknown; outcome?: string }>('/ingest/sms', {
    body: payload.body,
    address: payload.address,
    date: payload.date,
    messageId: payload.messageId,
  });
}

export async function submitSmsBatch(messages: SmsPayload[]) {
  if (Platform.OS !== 'android' || !messages.length) {
    return { matched: 0, created: 0, skipped: 0 };
  }
  return api.post<{ matched: number; created: number; skipped: number; items?: unknown[] }>(
    '/ingest/sms/batch',
    { messages }
  );
}

/** Scan recent bank-like SMS and post matches to the backend. */
export async function scanAndIngestRecent(limit = 40) {
  const native = loadNative();
  if (!native?.scanRecent) return { matched: 0, created: 0, skipped: 0 };
  const rows = await native.scanRecent(limit);
  if (!rows.length) return { matched: 0, created: 0, skipped: 0 };
  lastScanAt = Date.now();
  return submitSmsBatch(rows);
}

/**
 * Start live SMS listener + foreground rescan. Safe no-op on iOS / Expo Go
 * without the native module (requires EAS rebuild).
 */
export function startAndroidSmsBridge() {
  if (Platform.OS !== 'android' || started) return () => {};
  started = true;

  const native = loadNative();
  let sub: { remove: () => void } | undefined;

  if (native) {
    try {
      sub = native.addSmsListener?.((n) => {
        submitSms(n).catch(() => {});
      });
    } catch {
      // Expo Go
    }
  }

  const onAppState = (state: AppStateStatus) => {
    if (state !== 'active') return;
    if (!hasSmsPermission()) return;
    // Throttle rescans to once per 30s
    if (Date.now() - lastScanAt < 30_000) return;
    scanAndIngestRecent(25).catch(() => {});
  };

  const appSub = AppState.addEventListener('change', onAppState);

  // Initial light scan when bridge starts
  if (hasSmsPermission()) {
    scanAndIngestRecent(40).catch(() => {});
  }

  return () => {
    sub?.remove();
    appSub.remove();
    started = false;
  };
}
