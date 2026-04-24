export type AppFeedbackPlatform = 'ios' | 'android' | 'web';
export type AppFeedbackSource = 'prompt' | 'drawer-feedback';

export type SubmitAppFeedbackInput = {
  rating: number;
  comment?: string | null;
  platform: AppFeedbackPlatform;
  appVersion?: string | null;
  source: AppFeedbackSource;
};
