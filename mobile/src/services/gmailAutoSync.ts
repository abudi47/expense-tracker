import { AppState, type AppStateStatus } from 'react-native';
import { api, GmailSyncResult, UserPreferences } from './api';
import { emitDataRefresh } from '../utils/dataRefresh';
import { formatSyncToast, saveLastSyncStats } from '../utils/lastSyncStats';
import { notifyLocalDetected } from './pushNotifications';

const THROTTLE_MS = 15 * 60 * 1000;

let started = false;
let lastSyncAttempt = 0;
let inFlight: Promise<GmailSyncResult | null> | null = null;

type AutoSyncCallbacks = {
  onQueued?: (count: number, message: string) => void;
};

let callbacks: AutoSyncCallbacks = {};

export function setGmailAutoSyncCallbacks(next: AutoSyncCallbacks) {
  callbacks = next || {};
}

/** Reset throttle so the next auto-sync can run (e.g. after manual sync). */
export function markGmailSyncedNow() {
  lastSyncAttempt = Date.now();
}

async function prefsAllowSync(): Promise<boolean> {
  try {
    const prefs = await api.get<UserPreferences>('/settings/preferences');
    const ingest = prefs?.ingest;
    if (!ingest?.gmailConnected) return false;
    return !!(ingest.gmailBinance || ingest.gmailGrey);
  } catch {
    return false;
  }
}

/**
 * Run Gmail sync if connected + sources enabled and throttle allows.
 * Pass force=true to bypass throttle (Settings "Sync Gmail now").
 */
export async function runGmailAutoSync(options?: {
  force?: boolean;
}): Promise<GmailSyncResult | null> {
  const force = !!options?.force;

  if (!force && Date.now() - lastSyncAttempt < THROTTLE_MS) {
    return null;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const allowed = await prefsAllowSync();
      if (!allowed) return null;

      lastSyncAttempt = Date.now();
      const result = await api.post<GmailSyncResult>('/ingest/gmail/sync', {});
      const breakdown = {
        scanned: result.scanned || 0,
        queued: result.queued || 0,
        parseFailed: result.parseFailed || 0,
        duplicates: result.duplicates || 0,
        alreadyQueued: result.alreadyQueued || 0,
        skippedOther: result.skippedOther,
        needsReviewCount: result.needsReviewCount,
        samples: result.samples,
      };
      await saveLastSyncStats(breakdown);
      emitDataRefresh('gmail-sync');

      if (breakdown.queued > 0) {
        const msg = formatSyncToast(breakdown);
        await notifyLocalDetected(breakdown.queued).catch(() => {});
        callbacks.onQueued?.(breakdown.queued, msg);
      }

      return result;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Start foreground auto-sync while the user is logged in.
 * Safe to call once; returns a cleanup function.
 */
export function startGmailAutoSync() {
  if (started) return () => {};
  started = true;

  const onState = (state: AppStateStatus) => {
    if (state === 'active') {
      runGmailAutoSync().catch(() => {});
    }
  };

  const sub = AppState.addEventListener('change', onState);
  runGmailAutoSync().catch(() => {});

  return () => {
    sub.remove();
    started = false;
  };
}
