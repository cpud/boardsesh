import type { Climb } from '@/app/lib/types';
import type { AscentFeedItem } from '@/app/lib/graphql/operations/ticks';

/**
 * Maps an AscentFeedItem (logbook tick) to a Climb object so it can be
 * rendered by ClimbListItem. Fields not available on the ascent get safe
 * defaults — the logbook wrapper overrides title/subtitle via titleProps.
 */
export function ascentFeedItemToClimb(item: AscentFeedItem): Climb {
  return {
    uuid: item.climbUuid,
    name: item.climbName,
    setter_username: item.setterUsername ?? '',
    frames: item.frames ?? '',
    angle: item.angle,
    // Empty string suppresses ClimbTitle's built-in grade — logbook renders
    // both consensus and user grades in a shared grid via rightAddon.
    difficulty: '',
    quality_average: '0',
    stars: 0,
    difficulty_error: '0',
    ascensionist_count: 0,
    benchmark_difficulty: item.isBenchmark ? (item.consensusDifficultyName ?? null) : null,
    mirrored: item.isMirror,
    layoutId: item.layoutId,
    boardType: item.boardType,
  };
}
