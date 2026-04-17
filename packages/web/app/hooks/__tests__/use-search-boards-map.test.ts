import { describe, it, expect, vi } from 'vitest';

// The hook module also pulls in auth + GraphQL client modules via path aliases.
// We only exercise the pure `zoomToRadiusKm` helper here, so stub its peers.
vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: () => ({ token: null, isAuthenticated: false }),
}));
vi.mock('@/app/hooks/use-debounced-value', () => ({
  useDebouncedValue: <T>(v: T) => v,
}));
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: vi.fn() }),
}));
vi.mock('@/app/lib/graphql/operations', () => ({
  SEARCH_BOARDS: 'SEARCH_BOARDS_QUERY',
}));

import { zoomToRadiusKm } from '../use-search-boards-map';

describe('zoomToRadiusKm', () => {
  it('returns 5 km at high zoom levels (14+)', () => {
    expect(zoomToRadiusKm(14)).toBe(5);
    expect(zoomToRadiusKm(15)).toBe(5);
    expect(zoomToRadiusKm(18)).toBe(5);
    expect(zoomToRadiusKm(19)).toBe(5);
  });

  it('steps 10 → 15 → 20 km for zoom 13, 12, 11', () => {
    expect(zoomToRadiusKm(13)).toBe(10);
    expect(zoomToRadiusKm(12)).toBe(15);
    expect(zoomToRadiusKm(11)).toBe(20);
  });

  it('doubles roughly every zoom step below 11', () => {
    expect(zoomToRadiusKm(10)).toBe(40);
    expect(zoomToRadiusKm(9)).toBe(80);
    expect(zoomToRadiusKm(8)).toBe(160);
  });

  it('caps the radius at 300 km for zoom 7 and below', () => {
    expect(zoomToRadiusKm(7)).toBe(300);
    expect(zoomToRadiusKm(5)).toBe(300);
    expect(zoomToRadiusKm(0)).toBe(300);
    expect(zoomToRadiusKm(-1)).toBe(300);
  });

  it('uses the default 20 km bucket at zoom 11 (the drawer default)', () => {
    expect(zoomToRadiusKm(11)).toBe(20);
  });

  it('is monotonically non-decreasing as zoom decreases', () => {
    let prev = zoomToRadiusKm(19);
    for (let z = 18; z >= 0; z--) {
      const next = zoomToRadiusKm(z);
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
  });
});
