import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionContext } from '@boardsesh/shared-schema';

const { mockDb, mockPublishSocialEvent, insertCalls } = vi.hoisted(() => {
  const insertCalls: Array<{ table: unknown; values: unknown }> = [];

  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
  };

  const mockPublishSocialEvent = vi.fn().mockResolvedValue(undefined);

  return { mockDb, mockPublishSocialEvent, insertCalls };
});

vi.mock('../db/client', () => ({
  db: mockDb,
}));

vi.mock('../events', () => ({
  publishSocialEvent: mockPublishSocialEvent,
}));

vi.mock('../utils/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../utils/redis-rate-limiter', () => ({
  checkRateLimitRedis: vi.fn().mockResolvedValue(undefined),
}));

import { climbMutations } from '../graphql/resolvers/climbs/mutations';

function makeCtx(overrides: Partial<ConnectionContext> = {}): ConnectionContext {
  return {
    connectionId: 'conn-1',
    isAuthenticated: true,
    userId: 'user-123',
    sessionId: null,
    boardPath: null,
    controllerId: null,
    controllerApiKey: null,
    ...overrides,
  } as ConnectionContext;
}

function createMockChain(resolveValue: unknown = [], onValues?: (values: unknown) => void): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  const methods = ['from', 'where', 'leftJoin', 'limit', 'values'];

  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolveValue).then(resolve);

  for (const method of methods) {
    chain[method] = vi.fn((...args: unknown[]) => {
      if (method === 'values' && onValues) {
        onValues(args[0]);
      }
      return chain;
    });
  }

  return chain;
}

describe('climb mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
  });

  it('stores non-draft Aurora climbs as listed', async () => {
    mockDb.select.mockReturnValueOnce(createMockChain([
      { name: 'Alice', displayName: 'Alice Setter', image: null, avatarUrl: null },
    ]));
    mockDb.insert.mockImplementation((table: unknown) =>
      createMockChain(undefined, (values) => insertCalls.push({ table, values })),
    );

    await climbMutations.saveClimb(
      {},
      {
        input: {
          boardType: 'kilter',
          layoutId: 1,
          name: 'Test Aurora Climb',
          description: '',
          isDraft: false,
          frames: 'p1r43',
          angle: 40,
        },
      },
      makeCtx(),
    );

    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].values).toMatchObject({
      isDraft: false,
      isListed: true,
    });
  });

  it('stores non-draft MoonBoard climbs as listed', async () => {
    mockDb.select
      .mockReturnValueOnce(createMockChain([
        { name: 'Alice', displayName: 'Alice Setter', image: null, avatarUrl: null },
      ]))
      .mockReturnValueOnce(createMockChain([{ difficulty: 12 }]));
    mockDb.insert.mockImplementation((table: unknown) =>
      createMockChain(undefined, (values) => insertCalls.push({ table, values })),
    );

    await climbMutations.saveMoonBoardClimb(
      {},
      {
        input: {
          boardType: 'moonboard',
          layoutId: 3,
          name: 'MoonBoard Climb',
          description: '',
          holds: {
            start: ['A1'],
            hand: ['B2'],
            finish: ['C3'],
          },
          angle: 40,
          isDraft: false,
          userGrade: '6A+',
          isBenchmark: false,
        },
      },
      makeCtx(),
    );

    expect(insertCalls[0].values).toMatchObject({
      isDraft: false,
      isListed: true,
    });
  });
});
