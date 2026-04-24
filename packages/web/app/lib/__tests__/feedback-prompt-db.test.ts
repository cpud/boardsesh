import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

vi.mock('../ble/capacitor-utils', () => ({
  isNativeApp: () => true,
}));

import {
  incrementBluetoothSends,
  incrementSearches,
  getFeedbackStatus,
  setFeedbackStatus,
  shouldShowPrompt,
} from '../feedback-prompt-db';

const DB_NAME = 'boardsesh-feedback-prompt';
const STORE_NAME = 'feedback-prompt';

beforeEach(async () => {
  const db = await openDB(DB_NAME, 1, {
    upgrade(upgradeDb) {
      if (!upgradeDb.objectStoreNames.contains(STORE_NAME)) {
        upgradeDb.createObjectStore(STORE_NAME);
      }
    },
  });
  await db.clear(STORE_NAME);
  db.close();
});

describe('feedback-prompt-db', () => {
  it('starts with pending status and does not show prompt', async () => {
    expect(await getFeedbackStatus()).toBe('pending');
    expect(await shouldShowPrompt()).toBe(false);
  });

  it('shows prompt after 5 bluetooth sends', async () => {
    for (let i = 0; i < 4; i += 1) {
      await incrementBluetoothSends();
    }
    expect(await shouldShowPrompt()).toBe(false);
    await incrementBluetoothSends();
    expect(await shouldShowPrompt()).toBe(true);
  });

  it('shows prompt after 5 searches', async () => {
    for (let i = 0; i < 5; i += 1) {
      await incrementSearches();
    }
    expect(await shouldShowPrompt()).toBe(true);
  });

  it('does not show prompt once dismissed, even after more actions', async () => {
    for (let i = 0; i < 5; i += 1) {
      await incrementSearches();
    }
    await setFeedbackStatus('dismissed');
    expect(await shouldShowPrompt()).toBe(false);
    for (let i = 0; i < 10; i += 1) {
      await incrementBluetoothSends();
    }
    expect(await shouldShowPrompt()).toBe(false);
  });

  it('does not show prompt once submitted', async () => {
    for (let i = 0; i < 5; i += 1) {
      await incrementSearches();
    }
    await setFeedbackStatus('submitted');
    expect(await shouldShowPrompt()).toBe(false);
  });

  it('triggers at 5 of either counter (bluetooth OR search)', async () => {
    for (let i = 0; i < 3; i += 1) {
      await incrementSearches();
    }
    for (let i = 0; i < 4; i += 1) {
      await incrementBluetoothSends();
    }
    expect(await shouldShowPrompt()).toBe(false);
    await incrementBluetoothSends();
    expect(await shouldShowPrompt()).toBe(true);
  });
});

describe('shouldShowPrompt — web platform gate', () => {
  it('never shows on web even when threshold is met', async () => {
    vi.resetModules();
    vi.doMock('../ble/capacitor-utils', () => ({ isNativeApp: () => false }));
    const web = await import('../feedback-prompt-db');
    for (let i = 0; i < 10; i += 1) {
      await web.incrementSearches();
    }
    expect(await web.shouldShowPrompt()).toBe(false);
    vi.doUnmock('../ble/capacitor-utils');
  });
});
