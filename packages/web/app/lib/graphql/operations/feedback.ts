import { gql } from 'graphql-request';
import type { SubmitAppFeedbackInput } from '@boardsesh/shared-schema';

export const SUBMIT_APP_FEEDBACK = gql`
  mutation SubmitAppFeedback($input: SubmitAppFeedbackInput!) {
    submitAppFeedback(input: $input)
  }
`;

export interface SubmitAppFeedbackMutationVariables {
  input: SubmitAppFeedbackInput;
}

export interface SubmitAppFeedbackMutationResponse {
  submitAppFeedback: boolean;
}
