import { z } from 'zod';

export const SubmitAppFeedbackInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
  platform: z.enum(['ios', 'android', 'web']),
  appVersion: z.string().max(64).optional().nullable(),
  source: z.enum(['prompt', 'drawer-feedback']),
});

export type SubmitAppFeedbackInput = z.infer<typeof SubmitAppFeedbackInputSchema>;
