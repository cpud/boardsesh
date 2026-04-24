'use client';

import { useMutation } from '@tanstack/react-query';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  SUBMIT_APP_FEEDBACK,
  type SubmitAppFeedbackMutationVariables,
  type SubmitAppFeedbackMutationResponse,
} from '@/app/lib/graphql/operations';
import type { SubmitAppFeedbackInput } from '@boardsesh/shared-schema';
import { getPlatform } from '@/app/lib/ble/capacitor-utils';
import { getAppVersion } from '@/app/lib/app-info';
import { useWsAuthToken } from './use-ws-auth-token';

/** Fields callers provide; platform + appVersion are injected. */
export type SubmitAppFeedbackPayload = Omit<SubmitAppFeedbackInput, 'platform' | 'appVersion'>;

/**
 * Stateless submit helper. Use this when you don't have access to a
 * QueryClientProvider (e.g. a handler on a rarely-rendered button) and
 * want to fire the mutation directly. Auth token is optional — when
 * omitted, the submission is anonymous.
 */
export async function submitAppFeedback(payload: SubmitAppFeedbackPayload, token?: string | null): Promise<boolean> {
  const platform = getPlatform();
  const appVersion = await getAppVersion();
  const client = createGraphQLHttpClient(token ?? null);
  const variables: SubmitAppFeedbackMutationVariables = {
    input: { ...payload, platform, appVersion },
  };
  const response = await client.request<SubmitAppFeedbackMutationResponse>(SUBMIT_APP_FEEDBACK, variables);
  return response.submitAppFeedback;
}

/**
 * Fire-and-report submission of app feedback. The mutation is public; the
 * auth token is attached when available so the backend associates the
 * feedback with the user. The UI should close optimistically before awaiting
 * — an error surfaces a toast but does not reopen the prompt.
 */
export function useSubmitAppFeedback() {
  const { token } = useWsAuthToken();

  return useMutation({
    mutationFn: (payload: SubmitAppFeedbackPayload): Promise<boolean> => submitAppFeedback(payload, token),
  });
}
