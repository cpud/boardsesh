import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getBoardClimbSearchTag, getLayoutClimbSearchTag } from '@/app/lib/climb-search-cache';

const revalidateClimbSearchSchema = z.object({
  boardName: z.enum(['kilter', 'moonboard', 'tension']),
  layoutId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = revalidateClimbSearchSchema.parse(body);

    revalidateTag(getBoardClimbSearchTag(validated.boardName), { expire: 0 });

    if (validated.layoutId) {
      revalidateTag(getLayoutClimbSearchTag(validated.boardName, validated.layoutId), { expire: 0 });
    }

    return NextResponse.json({ revalidated: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }

    console.error('[Climb Search Cache] Revalidation failed:', error);
    return NextResponse.json({ error: 'Failed to revalidate climb search cache' }, { status: 500 });
  }
}
