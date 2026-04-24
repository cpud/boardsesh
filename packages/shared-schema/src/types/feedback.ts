export type AppFeedbackPlatform = 'ios' | 'android' | 'web';
export type AppFeedbackSource = 'prompt' | 'drawer-feedback';

export interface SubmitAppFeedbackInput {
  rating: number;
  comment?: string | null;
  platform: AppFeedbackPlatform;
  appVersion?: string | null;
  source: AppFeedbackSource;
}
