import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeSourceClimbHolds,
  deriveClimbHoldsFromFrames,
} from './aurora-board-import-helpers.js';

test('deriveClimbHoldsFromFrames maps aurora role codes', () => {
  const holds = deriveClimbHoldsFromFrames(
    {
      uuid: 'climb-1',
      frames: 'p101r1p102r2p103r3p104r4',
    },
    'grasshopper',
  );

  assert.deepEqual(holds, [
    { climbUuid: 'climb-1', holdId: 101, frameNumber: 0, holdState: 'STARTING' },
    { climbUuid: 'climb-1', holdId: 102, frameNumber: 0, holdState: 'HAND' },
    { climbUuid: 'climb-1', holdId: 103, frameNumber: 0, holdState: 'FINISH' },
    { climbUuid: 'climb-1', holdId: 104, frameNumber: 0, holdState: 'FOOT' },
  ]);
});

test('deriveClimbHoldsFromFrames prefers meaningful non-foot states for duplicate holds', () => {
  const holds = deriveClimbHoldsFromFrames(
    {
      uuid: 'climb-2',
      frames: 'p200r4p201r2,p200r2p202x1,p203r3',
    },
    'decoy',
  );

  assert.deepEqual(holds, [
    { climbUuid: 'climb-2', holdId: 200, frameNumber: 1, holdState: 'HAND' },
    { climbUuid: 'climb-2', holdId: 201, frameNumber: 0, holdState: 'HAND' },
    { climbUuid: 'climb-2', holdId: 202, frameNumber: 1, holdState: 'OFF' },
    { climbUuid: 'climb-2', holdId: 203, frameNumber: 2, holdState: 'FINISH' },
  ]);
});

test('dedupeSourceClimbHolds keeps the newest source hold row per climb and hold', () => {
  const holds = dedupeSourceClimbHolds([
    {
      climb_uuid: 'climb-3',
      hold_id: 301,
      frame_number: 0,
      hold_state: 'HAND',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      climb_uuid: 'climb-3',
      hold_id: 301,
      frame_number: 1,
      hold_state: 'FINISH',
      created_at: '2024-01-02T00:00:00Z',
    },
    {
      climb_uuid: 'climb-3',
      hold_id: 302,
      frame_number: 0,
      hold_state: 'STARTING',
      created_at: '2024-01-01T00:00:00Z',
    },
  ]);

  assert.deepEqual(holds, [
    { climbUuid: 'climb-3', holdId: 301, frameNumber: 1, holdState: 'FINISH' },
    { climbUuid: 'climb-3', holdId: 302, frameNumber: 0, holdState: 'STARTING' },
  ]);
});
