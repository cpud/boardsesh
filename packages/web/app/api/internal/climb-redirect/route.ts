import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db/db';
import * as schema from '@/app/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { constructClimbViewUrlWithSlugs } from '@/app/lib/url-utils';
import type { BoardName } from '@/app/lib/types';

/**
 * GET /api/internal/climb-redirect?boardType=...&climbUuid=...&proposalUuid=...
 *
 * Resolves a climb's full view URL from minimal data (boardType + climbUuid).
 * Returns JSON with the resolved URL so the client can navigate.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const boardType = searchParams.get('boardType');
  const climbUuid = searchParams.get('climbUuid');
  const proposalUuid = searchParams.get('proposalUuid');

  if (!boardType || !climbUuid) {
    return NextResponse.json({ error: 'Missing boardType or climbUuid' }, { status: 400 });
  }

  try {
    const db = getDb();

    // Look up the climb to get layoutId and angle
    const [climb] = await db
      .select({
        layoutId: schema.boardClimbs.layoutId,
        angle: schema.boardClimbs.angle,
      })
      .from(schema.boardClimbs)
      .where(
        and(
          eq(schema.boardClimbs.uuid, climbUuid),
          eq(schema.boardClimbs.boardType, boardType),
        ),
      )
      .limit(1);

    if (!climb) {
      return NextResponse.json({ error: 'Climb not found' }, { status: 404 });
    }

    const angle = climb.angle ?? 0;

    // Look up a default product size and set for this layout
    const [psls] = await db
      .select({
        productSizeId: schema.boardProductSizesLayoutsSets.productSizeId,
        setId: schema.boardProductSizesLayoutsSets.setId,
      })
      .from(schema.boardProductSizesLayoutsSets)
      .where(
        and(
          eq(schema.boardProductSizesLayoutsSets.boardType, boardType),
          eq(schema.boardProductSizesLayoutsSets.layoutId, climb.layoutId),
        ),
      )
      .limit(1);

    if (!psls || !psls.productSizeId || !psls.setId) {
      return NextResponse.json({ error: 'No board configuration found for this climb' }, { status: 404 });
    }

    // Collect all set IDs for this product size + layout combination
    const setRows = await db
      .select({ setId: schema.boardProductSizesLayoutsSets.setId })
      .from(schema.boardProductSizesLayoutsSets)
      .where(
        and(
          eq(schema.boardProductSizesLayoutsSets.boardType, boardType),
          eq(schema.boardProductSizesLayoutsSets.layoutId, climb.layoutId),
          eq(schema.boardProductSizesLayoutsSets.productSizeId, psls.productSizeId),
        ),
      );

    const setIdArray = setRows
      .map((r) => r.setId)
      .filter((id): id is number => id != null);

    let url: string;
    try {
      const details = getBoardDetailsForBoard({
        board_name: boardType as BoardName,
        layout_id: climb.layoutId,
        size_id: psls.productSizeId,
        set_ids: setIdArray,
      });
      if (details.layout_name && details.size_name && details.set_names) {
        url = constructClimbViewUrlWithSlugs(
          boardType,
          details.layout_name,
          details.size_name,
          details.size_description,
          details.set_names,
          angle,
          climbUuid,
        );
      } else {
        url = `/${boardType}/${climb.layoutId}/${psls.productSizeId}/${setIdArray.join(',')}/${angle}/view/${climbUuid}`;
      }
    } catch (slugError) {
      console.warn('[climb-redirect] Failed to resolve slug URL, falling back to numeric:', slugError);
      url = `/${boardType}/${climb.layoutId}/${psls.productSizeId}/${setIdArray.join(',')}/${angle}/view/${climbUuid}`;
    }

    if (proposalUuid) {
      url += `?proposalUuid=${encodeURIComponent(proposalUuid)}`;
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[climb-redirect] Error resolving climb URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
