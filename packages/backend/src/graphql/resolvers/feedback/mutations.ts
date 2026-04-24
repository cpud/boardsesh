import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { applyRateLimit, validateInput } from '../shared/helpers';
import { SubmitAppFeedbackInputSchema } from '../../../validation/schemas';

export const feedbackMutations = {
  submitAppFeedback: async (_: unknown, { input }: { input: unknown }, ctx: ConnectionContext): Promise<boolean> => {
    await applyRateLimit(ctx, 10, 'submitAppFeedback');

    const validated = validateInput(SubmitAppFeedbackInputSchema, input, 'input');

    await db.insert(dbSchema.appFeedback).values({
      userId: ctx.userId ?? null,
      rating: validated.rating,
      comment: validated.comment?.trim() ? validated.comment.trim() : null,
      platform: validated.platform,
      appVersion: validated.appVersion ?? null,
      source: validated.source,
    });

    return true;
  },
};
