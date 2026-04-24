export const feedbackTypeDefs = /* GraphQL */ `
  """
  Input for submitAppFeedback mutation.
  """
  input SubmitAppFeedbackInput {
    """
    1–5 star rating.
    """
    rating: Int!

    """
    Optional free-text comment. Typically present when rating is below 3.
    """
    comment: String

    """
    'ios' | 'android' | 'web'.
    """
    platform: String!

    """
    App build version (native) or deployed web version. Optional.
    """
    appVersion: String

    """
    Where the feedback originated: 'prompt' | 'drawer-feedback'.
    """
    source: String!
  }
`;
