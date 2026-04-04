import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

/**
 * Reactive hook that tracks browser online/offline status.
 * SSR-safe: returns { isOnline: true } on the server.
 *
 * Note: Currently not used in production code. The offline detection for
 * party mode uses WebSocket connection state via useMutationGuard instead.
 * This hook is available for future use (e.g. distinguishing "browser offline"
 * from "WebSocket disconnected but browser online" for UI messaging).
 */
export function useNetworkStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { isOnline };
}
