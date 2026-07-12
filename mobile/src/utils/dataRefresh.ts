import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

export const DATA_REFRESH_EVENT = 'asset-tracker:data-refresh';

export type DataRefreshReason =
  | 'gmail-sync'
  | 'detect-approve'
  | 'detect-dismiss'
  | 'scheduled-land'
  | 'transaction'
  | 'poll'
  | 'manual';

export function emitDataRefresh(reason: DataRefreshReason = 'manual') {
  DeviceEventEmitter.emit(DATA_REFRESH_EVENT, { reason, at: Date.now() });
}

/** Subscribe to refresh events; returns unsubscribe. */
export function onDataRefresh(handler: (payload: { reason: DataRefreshReason; at: number }) => void) {
  const sub = DeviceEventEmitter.addListener(DATA_REFRESH_EVENT, handler);
  return () => sub.remove();
}

/** Hook: call `reload` on focus-adjacent refresh events. */
export function useDataRefresh(reload: () => void) {
  useEffect(() => {
    return onDataRefresh(() => {
      reload();
    });
  }, [reload]);
}
