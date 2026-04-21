'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_BOARDS_BY_SERIAL_NUMBERS,
  type GetBoardsBySerialNumbersQueryResponse,
} from '@/app/lib/graphql/operations';
import { parseSerialNumber } from '@/app/components/board-bluetooth-control/bluetooth-aurora';
import { supportsCapacitorBleManualScan } from '@/app/lib/ble/capacitor-utils';
import type { DiscoveredDevice } from '@/app/lib/ble/types';
import type { UserBoard } from '@boardsesh/shared-schema';

// Auto-stop scan after this duration
const SCAN_TIMEOUT_MS = 15_000;

export type BluetoothScanStatus = 'idle' | 'scanning' | 'done' | 'unavailable';

interface PluginListenerHandle {
  remove(): Promise<void>;
}

interface CapacitorScanResult {
  device: { deviceId: string; name?: string };
  localName?: string;
  rssi: number;
}

interface RawBlePlugin {
  initialize(): Promise<void>;
  isEnabled(): Promise<{ value: boolean }>;
  requestLEScan?(options: { services?: string[] }): Promise<void>;
  stopLEScan?(): Promise<void>;
  addListener(
    eventName: string,
    callback: (data: Record<string, unknown>) => void,
  ): Promise<PluginListenerHandle>;
}

function getBlePlugin(): RawBlePlugin | null {
  const plugin = window.Capacitor?.Plugins?.BluetoothLe;
  return plugin ? (plugin as RawBlePlugin) : null;
}

export function useBluetoothScan() {
  const { token } = useWsAuthToken();
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [resolvedBoards, setResolvedBoards] = useState<Map<string, UserBoard>>(new Map());
  // Start as 'idle' to avoid SSR/client hydration mismatch — check capabilities in useEffect
  const [status, setStatus] = useState<BluetoothScanStatus>('idle');

  useEffect(() => {
    if (!supportsCapacitorBleManualScan()) {
      setStatus('unavailable');
    }
  }, []);

  // Refs to manage scan lifecycle across renders
  const scanListenerRef = useRef<PluginListenerHandle | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const devicesMapRef = useRef<Map<string, DiscoveredDevice>>(new Map());
  const resolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopScan = useCallback(async () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
      resolveTimeoutRef.current = null;
    }
    if (scanListenerRef.current) {
      await scanListenerRef.current.remove();
      scanListenerRef.current = null;
    }
    const ble = getBlePlugin();
    if (ble?.stopLEScan) {
      await ble.stopLEScan().catch(() => {});
    }
  }, []);

  // Resolve serial numbers to boards via GraphQL
  const resolveSerials = useCallback(async (deviceMap: Map<string, DiscoveredDevice>) => {
    if (!token) return;

    const serials: string[] = [];
    for (const device of deviceMap.values()) {
      const serial = parseSerialNumber(device.name);
      if (serial) serials.push(serial);
    }

    if (serials.length === 0) return;

    try {
      const client = createGraphQLHttpClient(token);
      const data = await client.request<GetBoardsBySerialNumbersQueryResponse>(
        GET_BOARDS_BY_SERIAL_NUMBERS,
        { serialNumbers: [...new Set(serials)] },
      );

      const boardMap = new Map<string, UserBoard>();
      for (const board of data.boardsBySerialNumbers) {
        if (board.serialNumber) {
          boardMap.set(board.serialNumber, board);
        }
      }
      setResolvedBoards(boardMap);
    } catch (err) {
      console.error('[BLE Scan] Failed to resolve serial numbers:', err);
    }
  }, [token]);

  const startScan = useCallback(async () => {
    if (!supportsCapacitorBleManualScan()) {
      setStatus('unavailable');
      return;
    }

    const ble = getBlePlugin();
    if (!ble || !ble.requestLEScan || !ble.stopLEScan) {
      setStatus('unavailable');
      return;
    }

    // Clean up any previous scan
    await stopScan();
    devicesMapRef.current.clear();
    setDevices([]);
    setResolvedBoards(new Map());
    setStatus('scanning');

    try {
      await ble.initialize();

      const { value: enabled } = await ble.isEnabled();
      if (!enabled) {
        setStatus('unavailable');
        return;
      }

      // Register scan result listener
      scanListenerRef.current = await ble.addListener('onScanResult', (data) => {
        const result = data as unknown as CapacitorScanResult;
        const device: DiscoveredDevice = {
          deviceId: result.device.deviceId,
          name: result.localName || result.device.name,
          rssi: result.rssi,
        };

        // Deduplicate by name (includes serial for Aurora boards)
        const dedupeKey = device.name || device.deviceId;
        devicesMapRef.current.set(dedupeKey, device);
        setDevices([...devicesMapRef.current.values()]);

        // Debounce serial resolution — wait 500ms after last device found
        if (resolveTimeoutRef.current) {
          clearTimeout(resolveTimeoutRef.current);
        }
        resolveTimeoutRef.current = setTimeout(() => {
          resolveSerials(devicesMapRef.current);
        }, 500);
      });

      // Start scanning (no service filter to find all board types)
      await ble.requestLEScan({});

      // Auto-stop after timeout
      scanTimeoutRef.current = setTimeout(async () => {
        await stopScan();
        // Final resolve attempt
        await resolveSerials(devicesMapRef.current);
        setStatus('done');
      }, SCAN_TIMEOUT_MS);
    } catch (err) {
      console.error('[BLE Scan] Scan failed:', err);
      await stopScan();
      setStatus('done');
    }
  }, [stopScan, resolveSerials]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScan();
    };
  }, [stopScan]);

  return { devices, resolvedBoards, status, startScan, stopScan };
}
