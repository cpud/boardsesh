import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineReconciliation, type UseOfflineReconciliationParams } from '../use-offline-reconciliation';
import type { ClimbQueueItem } from '../../../queue-control/types';
import type { Climb } from '@/app/lib/types';
import type { SubscriptionQueueEvent } from '@boardsesh/shared-schema';

const mockClimb: Climb = {
  uuid: 'climb-1',
  setter_username: 'setter1',
  name: 'Test Climb',
  description: '',
  frames: '',
  angle: 40,
  ascensionist_count: 5,
  difficulty: '7',
  quality_average: '3.5',
  stars: 3,
  difficulty_error: '',
  mirrored: false,
  benchmark_difficulty: null,
  userAscents: 0,
  userAttempts: 0,
};

function createItem(uuid: string): ClimbQueueItem {
  return {
    uuid,
    climb: { ...mockClimb, uuid: `climb-${uuid}` },
    addedBy: 'user-1',
    suggested: false,
  };
}

describe('useOfflineReconciliation', () => {
  const mockAddQueueItem = vi.fn().mockResolvedValue(undefined);
  const mockClearBuffer = vi.fn();
  const mockGetBufferedAdditions = vi.fn<() => ClimbQueueItem[]>().mockReturnValue([]);
  let subscriberCallback: ((event: SubscriptionQueueEvent) => void) | null = null;
  const mockSubscribeToQueueEvents = vi.fn((cb: (event: SubscriptionQueueEvent) => void) => {
    subscriberCallback = cb;
    return () => { subscriberCallback = null; };
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    subscriberCallback = null;
    mockGetBufferedAdditions.mockReturnValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderReconciliation(overrides: {
    isOffline?: boolean;
    isPersistentSessionActive?: boolean;
    hasConnected?: boolean;
    currentQueue?: ClimbQueueItem[];
  } = {}) {
    return renderHook<void, UseOfflineReconciliationParams>(
      (props) => useOfflineReconciliation(props),
      {
        initialProps: {
          offlineBuffer: {
            getBufferedAdditions: mockGetBufferedAdditions,
            clearBuffer: mockClearBuffer,
            hasPendingAdditions: mockGetBufferedAdditions().length > 0,
            bufferAddition: vi.fn(),
          },
          isOffline: overrides.isOffline ?? false,
          isPersistentSessionActive: overrides.isPersistentSessionActive ?? true,
          hasConnected: overrides.hasConnected ?? true,
          persistentSession: {
            addQueueItem: mockAddQueueItem,
            subscribeToQueueEvents: mockSubscribeToQueueEvents,
          },
          currentQueue: overrides.currentQueue ?? [],
        },
      },
    );
  }

  it('does nothing when no pending additions on reconnect', () => {
    // Start offline
    const { rerender } = renderReconciliation({ isOffline: true });

    // Go online
    rerender({
      offlineBuffer: {
        getBufferedAdditions: mockGetBufferedAdditions,
        clearBuffer: mockClearBuffer,
        hasPendingAdditions: false,
        bufferAddition: vi.fn(),
      },
      isOffline: false,
      isPersistentSessionActive: true,
      hasConnected: true,
      persistentSession: {
        addQueueItem: mockAddQueueItem,
        subscribeToQueueEvents: mockSubscribeToQueueEvents,
      },
      currentQueue: [],
    });

    expect(mockAddQueueItem).not.toHaveBeenCalled();
    expect(mockClearBuffer).not.toHaveBeenCalled();
  });

  it('reconciles buffered additions after FullSync on reconnect', async () => {
    const item1 = createItem('offline-1');
    const item2 = createItem('offline-2');
    mockGetBufferedAdditions.mockReturnValue([item1, item2]);

    // Start offline with pending additions
    const { rerender } = renderReconciliation({ isOffline: true });

    // Go online
    rerender({
      offlineBuffer: {
        getBufferedAdditions: mockGetBufferedAdditions,
        clearBuffer: mockClearBuffer,
        hasPendingAdditions: true,
        bufferAddition: vi.fn(),
      },
      isOffline: false,
      isPersistentSessionActive: true,
      hasConnected: true,
      persistentSession: {
        addQueueItem: mockAddQueueItem,
        subscribeToQueueEvents: mockSubscribeToQueueEvents,
      },
      currentQueue: [],
    });

    // Simulate FullSync event
    expect(subscriberCallback).not.toBeNull();
    await act(async () => {
      subscriberCallback!({
        __typename: 'FullSync',
        sequence: 10,
        state: { queue: [] as never[], currentClimbQueueItem: null, stateHash: 'abc', sequence: 10 },
      });
    });

    expect(mockAddQueueItem).toHaveBeenCalledTimes(2);
    expect(mockAddQueueItem).toHaveBeenCalledWith(item1);
    expect(mockAddQueueItem).toHaveBeenCalledWith(item2);
    expect(mockClearBuffer).toHaveBeenCalled();
  });

  it('skips items already in server queue by UUID', async () => {
    const item1 = createItem('offline-1');
    const existingItem = createItem('existing-1');
    mockGetBufferedAdditions.mockReturnValue([item1, existingItem]);

    // Start offline
    const { rerender } = renderReconciliation({ isOffline: true });

    // Go online with existing item already in queue
    rerender({
      offlineBuffer: {
        getBufferedAdditions: mockGetBufferedAdditions,
        clearBuffer: mockClearBuffer,
        hasPendingAdditions: true,
        bufferAddition: vi.fn(),
      },
      isOffline: false,
      isPersistentSessionActive: true,
      hasConnected: true,
      persistentSession: {
        addQueueItem: mockAddQueueItem,
        subscribeToQueueEvents: mockSubscribeToQueueEvents,
      },
      currentQueue: [existingItem],
    });

    // Simulate FullSync
    await act(async () => {
      subscriberCallback!({
        __typename: 'FullSync',
        sequence: 10,
        state: {
          queue: [existingItem as never],
          currentClimbQueueItem: null,
          stateHash: 'abc',
          sequence: 10,
        },
      });
    });

    // Should only add item1, not existingItem
    expect(mockAddQueueItem).toHaveBeenCalledTimes(1);
    expect(mockAddQueueItem).toHaveBeenCalledWith(item1);
    expect(mockClearBuffer).toHaveBeenCalled();
  });

  it('continues reconciliation even if one addQueueItem fails', async () => {
    const item1 = createItem('offline-1');
    const item2 = createItem('offline-2');
    const item3 = createItem('offline-3');
    mockGetBufferedAdditions.mockReturnValue([item1, item2, item3]);
    mockAddQueueItem
      .mockResolvedValueOnce(undefined) // item1 succeeds
      .mockRejectedValueOnce(new Error('Network error')) // item2 fails
      .mockResolvedValueOnce(undefined); // item3 succeeds

    // Start offline
    const { rerender } = renderReconciliation({ isOffline: true });

    // Go online
    rerender({
      offlineBuffer: {
        getBufferedAdditions: mockGetBufferedAdditions,
        clearBuffer: mockClearBuffer,
        hasPendingAdditions: true,
        bufferAddition: vi.fn(),
      },
      isOffline: false,
      isPersistentSessionActive: true,
      hasConnected: true,
      persistentSession: {
        addQueueItem: mockAddQueueItem,
        subscribeToQueueEvents: mockSubscribeToQueueEvents,
      },
      currentQueue: [],
    });

    // Simulate FullSync
    await act(async () => {
      subscriberCallback!({
        __typename: 'FullSync',
        sequence: 10,
        state: { queue: [] as never[], currentClimbQueueItem: null, stateHash: 'abc', sequence: 10 },
      });
    });

    // All three should have been attempted
    expect(mockAddQueueItem).toHaveBeenCalledTimes(3);
    // Buffer should still be cleared
    expect(mockClearBuffer).toHaveBeenCalled();
  });

  it('reconciles via safety timeout if no FullSync arrives', async () => {
    const item1 = createItem('offline-1');
    mockGetBufferedAdditions.mockReturnValue([item1]);

    // Start offline
    const { rerender } = renderReconciliation({ isOffline: true });

    // Go online
    rerender({
      offlineBuffer: {
        getBufferedAdditions: mockGetBufferedAdditions,
        clearBuffer: mockClearBuffer,
        hasPendingAdditions: true,
        bufferAddition: vi.fn(),
      },
      isOffline: false,
      isPersistentSessionActive: true,
      hasConnected: true,
      persistentSession: {
        addQueueItem: mockAddQueueItem,
        subscribeToQueueEvents: mockSubscribeToQueueEvents,
      },
      currentQueue: [],
    });

    // No FullSync event arrives, wait for timeout (15s)
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(mockAddQueueItem).toHaveBeenCalledTimes(1);
    expect(mockAddQueueItem).toHaveBeenCalledWith(item1);
    expect(mockClearBuffer).toHaveBeenCalled();
  });

  it('does not reconcile when session is not active', () => {
    const item1 = createItem('offline-1');
    mockGetBufferedAdditions.mockReturnValue([item1]);

    // Start offline
    const { rerender } = renderReconciliation({
      isOffline: true,
      isPersistentSessionActive: true,
    });

    // Go online but session deactivated
    rerender({
      offlineBuffer: {
        getBufferedAdditions: mockGetBufferedAdditions,
        clearBuffer: mockClearBuffer,
        hasPendingAdditions: true,
        bufferAddition: vi.fn(),
      },
      isOffline: false,
      isPersistentSessionActive: false,
      hasConnected: true,
      persistentSession: {
        addQueueItem: mockAddQueueItem,
        subscribeToQueueEvents: mockSubscribeToQueueEvents,
      },
      currentQueue: [],
    });

    expect(mockAddQueueItem).not.toHaveBeenCalled();
  });
});
