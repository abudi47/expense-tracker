import * as SecureStore from 'expo-secure-store';

const KEY = 'gmail_last_sync_stats';

export type GmailSyncBreakdown = {
  scanned: number;
  queued: number;
  parseFailed: number;
  duplicates: number;
  alreadyQueued: number;
  skippedOther?: number;
  needsReviewCount?: number;
  samples?: Array<{
    reason: string;
    from?: string;
    subject?: string;
    snippet?: string;
  }>;
  at?: string;
};

export function formatSyncToast(r: GmailSyncBreakdown): string {
  const parts = [
    `Scanned ${r.scanned}`,
    `${r.queued} new`,
  ];
  if (r.parseFailed > 0) parts.push(`${r.parseFailed} couldn’t parse`);
  if (r.alreadyQueued > 0) parts.push(`${r.alreadyQueued} already queued`);
  if (r.duplicates > 0) parts.push(`${r.duplicates} already seen`);
  return parts.join(' · ');
}

export async function saveLastSyncStats(stats: GmailSyncBreakdown) {
  const payload: GmailSyncBreakdown = { ...stats, at: new Date().toISOString() };
  await SecureStore.setItemAsync(KEY, JSON.stringify(payload));
  return payload;
}

export async function loadLastSyncStats(): Promise<GmailSyncBreakdown | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GmailSyncBreakdown;
  } catch {
    return null;
  }
}
