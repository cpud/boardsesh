import { describe, it, expect } from 'vitest';
import { isNoMatchClimb } from '../no-match-climb';

describe('isNoMatchClimb', () => {
  it('returns false for non-tension boards', () => {
    expect(isNoMatchClimb('p1r5p2r6', 'kilter')).toBe(false);
    expect(isNoMatchClimb('p1r5p2r6', 'moonboard')).toBe(false);
  });

  it('returns false for null/undefined/empty frames', () => {
    expect(isNoMatchClimb(null, 'tension')).toBe(false);
    expect(isNoMatchClimb(undefined, 'tension')).toBe(false);
    expect(isNoMatchClimb('', 'tension')).toBe(false);
  });

  it('returns false for tension climbs using only standard roles (1-4)', () => {
    expect(isNoMatchClimb('p100r1p200r2p300r3p400r4', 'tension')).toBe(false);
  });

  it('returns true for tension climbs using no-match roles (5-8)', () => {
    // Role 5 = no-match starting
    expect(isNoMatchClimb('p100r5p200r2', 'tension')).toBe(true);
    // Role 6 = no-match hand
    expect(isNoMatchClimb('p100r1p200r6', 'tension')).toBe(true);
    // Role 7 = no-match finish
    expect(isNoMatchClimb('p100r1p200r7', 'tension')).toBe(true);
    // Role 8 = no-match foot
    expect(isNoMatchClimb('p100r1p200r8', 'tension')).toBe(true);
  });

  it('does not false-positive on role codes like r50 or r80', () => {
    // r50 should NOT match as no-match (it's role 50, not role 5)
    expect(isNoMatchClimb('p100r50p200r2', 'tension')).toBe(false);
    expect(isNoMatchClimb('p100r80p200r2', 'tension')).toBe(false);
  });

  it('detects no-match roles in multi-frame climbs', () => {
    // Two frames separated by comma
    expect(isNoMatchClimb('p100r1p200r2,p100r5p200r6', 'tension')).toBe(true);
  });
});
