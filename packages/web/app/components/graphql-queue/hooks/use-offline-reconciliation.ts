import { useEffect, useRef } from 'react';
import type { SubscriptionQueueEvent } from '@boardsesh/shared-schema';
import type { ClimbQueueItem } from '../../queue-control/types';

const RECONCILIATION_TIMEOUT_MS = 15000;

export interface UseOfflineReconciliationParams {
  offlineBuffer: {
    getBufferedAdditions: () => ClimbQueueItem[];
    clearBuffer: () => void;
    hasPendingAdditions: boolean;
    bufferAddition: (item: ClimbQueueItem) => void;
  };
  isOffline: boolean;
  isPersistentSessionActive: boolean;
  hasConnected: boolean;
  persistentSession: {
    addQueueItem: (item: ClimbQueueItem) => Promise<void>;
    subscribeToQueueEvents: (callback: (event: SubscriptionQueueEvent) => void) => () => void;
  };
  currentQueue: ClimbQueueItem[];
}

/**
 * Watches for offline-to-online transitions and reconciles buffered
 * additions by pushing them to the server after the reconnection
 * FullSync completes.
 */
export function useOfflineReconciliation({
  offlineBuffer,
  isOffline,
  isPersistentSessionActive,
  hasConnected,
  persistentSession,
  currentQueue,
}: UseOfflineReconciliationParams) {
  const wasOfflineRef = useRef(isOffline);
  const isReconcilingRef = useRef(false);
  const currentQueueRef = useRef(currentQueue);

  // Keep queue ref fresh
  currentQueueRef.current = currentQueue;

  useEffect(() => {
    const wasOffline = wasOfflineRef.current;
    wasOfflineRef.current = isOffline;

    // Detect offline-to-online transition
    if (!wasOffline || isOffline) return;
    if (!isPersistentSessionActive || !hasConnected) return;
    if (!offlineBuffer.hasPendingAdditions) return;
    if (isReconcilingRef.current) return;

    isReconcilingRef.current = true;

    async function reconcile(serverQueue: ClimbQueueItem[]) {
      const pending = offlineBuffer.getBufferedAdditions();
      const serverUuids = new Set(serverQueue.map(item => item.uuid));

      for (const item of pending) {
        if (serverUuids.has(item.uuid)) continue;
        try {
          await persistentSession.addQueueItem(item);
        } catch (error) {
          console.error('[OfflineReconciliation] Failed to add buffered item:', item.climb?.name, error);
        }
      }

      offlineBuffer.clearBuffer();
      isReconcilingRef.current = false;
    }

    // Subscribe to queue events and wait for FullSync
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = persistentSession.subscribeToQueueEvents((event: SubscriptionQueueEvent) => {
      if (event.__typename === 'FullSync') {
        if (timeoutId) clearTimeout(timeoutId);
        unsubscribe();
        const serverQueue = (event.state?.queue ?? []) as ClimbQueueItem[];
        reconcile(serverQueue);
      }
    });

    // Safety timeout: reconcile against current queue if no FullSync arrives
    timeoutId = setTimeout(() => {
      unsubscribe();
      reconcile(currentQueueRef.current);
    }, RECONCILIATION_TIMEOUT_MS);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
      isReconcilingRef.current = false;
    };
  }, [isOffline, isPersistentSessionActive, hasConnected, offlineBuffer, persistentSession]);
}
