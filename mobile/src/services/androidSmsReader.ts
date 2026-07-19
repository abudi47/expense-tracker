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

export type ScanIngestResult = {
  matched: number;
  created: number;
  skipped: number;
  scanned?: number;
  error?: string;
};

let started = false;
let lastScanAt = 0;
let stopBridge: (() => void) | null = null;

function loadNative(): NativeApi | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('android-sms-reader') as NativeApi & { default?: NativeApi };
    const api = (mod?.default ?? mod) as NativeApi;
    if (typeof api?.isSupported === 'function') return api;
    if (typeof (mod as NativeApi)?.isSupported === 'function') return mod as NativeApi;
    return null;
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
    return { matched: 0, created: 0, skipped: 0, scanned: 0 } satisfies ScanIngestResult;
  }
  return api.post<ScanIngestResult>('/ingest/sms/batch', { messages });
}

/** Scan recent bank-like SMS and post matches to the backend. */
export async function scanAndIngestRecent(limit = 80): Promise<ScanIngestResult> {
  const native = loadNative();
  if (!native?.scanRecent) {
    return {
      matched: 0,
      created: 0,
      skipped: 0,
      scanned: 0,
      error: 'Native SMS module unavailable — install the EAS APK (not Expo Go).',
    };
  }
  if (!hasSmsPermission()) {
    return {
      matched: 0,
      created: 0,
      skipped: 0,
      scanned: 0,
      error: 'SMS permission not granted.',
    };
  }

  let rows: SmsPayload[] = [];
  try {
    rows = await native.scanRecent(limit);
  } catch (err) {
    return {
      matched: 0,
      created: 0,
      skipped: 0,
      scanned: 0,
      error: err instanceof Error ? err.message : 'Failed to read SMS inbox',
    };
  }

  if (!rows.length) {
    return {
      matched: 0,
      created: 0,
      skipped: 0,
      scanned: 0,
      error: 'No bank-like SMS found in recent inbox.',
    };
  }

  lastScanAt = Date.now();
  try {
    const result = await submitSmsBatch(rows);
    return { ...result, scanned: rows.length };
  } catch (err) {
    return {
      matched: 0,
      created: 0,
      skipped: 0,
      scanned: rows.length,
      error: err instanceof Error ? err.message : 'Failed to upload SMS',
    };
  }
}

/**
 * Start live SMS listener + foreground rescan. Safe no-op on iOS / Expo Go
 * without the native module (requires EAS rebuild).
 */
export function startAndroidSmsBridge() {
  if (Platform.OS !== 'android' || started) {
    return stopBridge || (() => {});
  }
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
    if (Date.now() - lastScanAt < 30_000) return;
    scanAndIngestRecent(50).catch(() => {});
  };

  const appSub = AppState.addEventListener('change', onAppState);

  if (hasSmsPermission()) {
    scanAndIngestRecent(80).catch(() => {});
  }

  stopBridge = () => {
    sub?.remove();
    appSub.remove();
    started = false;
    stopBridge = null;
  };

  return stopBridge;
}

/** Fetch prefs-aware start: call after login when androidSms is enabled. */
export async function startSmsBridgeIfEnabled() {
  if (Platform.OS !== 'android') return () => {};
  try {
    const prefs = await api.get<{ ingest?: { androidSms?: boolean; androidNotifications?: boolean } }>(
      '/settings/preferences'
    );
    if (prefs?.ingest?.androidSms || prefs?.ingest?.androidNotifications) {
      return startAndroidSmsBridge();
    }
  } catch {
    // offline / not logged in
  }
  return () => {};
}
