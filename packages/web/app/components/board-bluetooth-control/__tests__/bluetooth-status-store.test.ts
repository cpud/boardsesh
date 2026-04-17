import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  registerBluetoothConnection,
  disconnectAllBluetooth,
  useBluetoothConnectedStatus,
} from '../bluetooth-status-store';

// Track release functions so each test can clear its own registrations
// (the store keeps module-level state).
const pendingReleases: Array<() => void> = [];

function register(disconnect: () => void): () => void {
  const release = registerBluetoothConnection(disconnect);
  pendingReleases.push(release);
  return release;
}

afterEach(() => {
  while (pendingReleases.length > 0) {
    pendingReleases.pop()?.();
  }
});

describe('bluetooth-status-store', () => {
  describe('registerBluetoothConnection', () => {
    it('returns a release function that is idempotent', () => {
      const disconnect = vi.fn();
      const release = register(disconnect);
      release();
      release();
      expect(disconnect).not.toHaveBeenCalled();
    });
  });

  describe('disconnectAllBluetooth', () => {
    it('invokes every registered disconnect handler', () => {
      const a = vi.fn();
      const b = vi.fn();
      register(a);
      register(b);

      disconnectAllBluetooth();

      expect(a).toHaveBeenCalledOnce();
      expect(b).toHaveBeenCalledOnce();
    });

    it('continues invoking handlers when one throws', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const broken = vi.fn(() => { throw new Error('boom'); });
      const ok = vi.fn();
      register(broken);
      register(ok);

      disconnectAllBluetooth();

      expect(broken).toHaveBeenCalledOnce();
      expect(ok).toHaveBeenCalledOnce();
      consoleSpy.mockRestore();
    });

    it('is a no-op when nothing is registered', () => {
      expect(() => disconnectAllBluetooth()).not.toThrow();
    });
  });

  describe('useBluetoothConnectedStatus', () => {
    it('returns false when nothing is registered', () => {
      const { result } = renderHook(() => useBluetoothConnectedStatus());
      expect(result.current).toBe(false);
    });

    it('returns true when a connection is registered', () => {
      const { result } = renderHook(() => useBluetoothConnectedStatus());

      act(() => {
        register(vi.fn());
      });

      expect(result.current).toBe(true);
    });

    it('returns false after the connection is released', () => {
      const { result } = renderHook(() => useBluetoothConnectedStatus());

      let release: () => void;
      act(() => {
        release = register(vi.fn());
      });

      expect(result.current).toBe(true);

      act(() => {
        release();
      });

      expect(result.current).toBe(false);
    });

    it('stays true when one of multiple connections is released', () => {
      const { result } = renderHook(() => useBluetoothConnectedStatus());

      let releaseFirst: () => void;
      act(() => {
        releaseFirst = register(vi.fn());
        register(vi.fn());
      });

      expect(result.current).toBe(true);

      act(() => {
        releaseFirst();
      });

      // Second connection still active
      expect(result.current).toBe(true);
    });
  });
});
