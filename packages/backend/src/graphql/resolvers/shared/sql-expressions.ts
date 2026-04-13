import { sql, eq, and } from 'drizzle-orm';
import * as dbSchema from '@boardsesh/db/schema';
import { db } from '../../../db/client';

/**
 * SQL expression: consensus difficulty name from board_climb_stats.
 * Requires boardClimbStats to be joined in the query.
 */
export const consensusDifficultyNameExpr = sql<string | null>`(
  SELECT bdg.boulder_name
  FROM board_difficulty_grades bdg
  WHERE bdg.board_type = ${dbSchema.boardseshTicks.boardType}
    AND bdg.difficulty = ROUND(${dbSchema.boardClimbStats.displayDifficulty})
  LIMIT 1
)`;

/**
 * SQL expression: COALESCE user-logged grade with consensus grade.
 * Falls back to consensus when user didn't log a grade.
 * Requires both boardDifficultyGrades and boardClimbStats to be joined.
 */
export const difficultyNameWithFallbackExpr = sql<string | null>`COALESCE(
  ${dbSchema.boardDifficultyGrades.boulderName},
  (
    SELECT bdg.boulder_name
    FROM board_difficulty_grades bdg
    WHERE bdg.board_type = ${dbSchema.boardseshTicks.boardType}
      AND bdg.difficulty = ROUND(${dbSchema.boardClimbStats.displayDifficulty})
    LIMIT 1
  )
)`;

/**
 * SQL expression: rounded consensus difficulty ID.
 * Requires boardClimbStats to be joined in the query.
 */
export const consensusDifficultyExpr = sql<number | null>`ROUND(${dbSchema.boardClimbStats.displayDifficulty})`;

/**
 * Imperative query: look up consensus grade name for a specific climb+angle.
 * Used in contexts where an inline SQL expression isn't possible (e.g. event publishing).
 */
export async function getConsensusDifficultyName(
  climbUuid: string,
  boardType: string,
  angle: number,
): Promise<string | undefined> {
  const [result] = await db
    .select({ boulderName: dbSchema.boardDifficultyGrades.boulderName })
    .from(dbSchema.boardClimbStats)
    .innerJoin(
      dbSchema.boardDifficultyGrades,
      and(
        eq(dbSchema.boardDifficultyGrades.difficulty, sql`ROUND(${dbSchema.boardClimbStats.displayDifficulty})`),
        eq(dbSchema.boardDifficultyGrades.boardType, dbSchema.boardClimbStats.boardType),
      ),
    )
    .where(
      and(
        eq(dbSchema.boardClimbStats.climbUuid, climbUuid),
        eq(dbSchema.boardClimbStats.boardType, boardType),
        eq(dbSchema.boardClimbStats.angle, angle),
      ),
    )
    .limit(1);
  return result?.boulderName ?? undefined;
}
