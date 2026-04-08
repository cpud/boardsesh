import type { BoardName } from './types';

/**
 * Tension "no matching" role codes.
 *
 * In the Tension board, placement roles 1-4 are the standard (matching-allowed)
 * roles, while 5-8 are the "no matching" variants where each hold is assigned
 * to a specific hand.  A climb that uses ANY role from the 5-8 set is a
 * "no matching" climb — you cannot place both hands on the same hold.
 */
const TENSION_NO_MATCH_ROLES = new Set([5, 6, 7, 8]);

/**
 * Returns `true` when a climb's frames data contains "no matching" role codes.
 *
 * Currently only the Tension board distinguishes matching vs. no-matching via
 * separate placement-role IDs.
 *
 * Frame format: `p{placementId}r{roleCode}` tokens separated by `p`, with
 * multiple frames delimited by `,`.
 */
export function isNoMatchClimb(frames: string | undefined | null, boardType: BoardName | string): boolean {
  if (boardType !== 'tension' || !frames) return false;

  // Fast regex scan: find any `r5`, `r6`, `r7`, or `r8` token boundary
  // that isn't followed by more digits (e.g., `r50` should NOT match).
  return /r[5-8](?!\d)/.test(frames);
}
