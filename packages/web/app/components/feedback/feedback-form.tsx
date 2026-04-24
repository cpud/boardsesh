'use client';

import React, { useId, useState } from 'react';
import MuiButton from '@mui/material/Button';
import MuiTypography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { InlineStarPicker } from '@/app/components/logbook/tick-controls';
import styles from './feedback-form.module.css';

type View = 'rating' | 'comment';

interface FeedbackFormProps {
  /**
   * 'prompt' — automatic nudge; requires a star rating; low ratings ask for a comment.
   * 'drawer-feedback' — manual from user drawer; rating optional, comment is the focus.
   */
  mode: 'prompt' | 'drawer-feedback';
  /**
   * Called with the captured rating and optional comment. Return false or throw
   * to stay open; resolve (void/true) to indicate the caller has closed the form.
   */
  onSubmit: (values: { rating: number | null; comment: string | null }) => void | Promise<void>;
  onCancel?: () => void;
  title: string;
  submitLabel?: string;
  /** If provided, used as the id on the heading so the wrapper can aria-labelledby it. */
  titleId?: string;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  mode,
  onSubmit,
  onCancel,
  title,
  submitLabel = 'Save',
  titleId,
}) => {
  const generatedId = useId();
  const resolvedTitleId = titleId ?? generatedId;
  const [rating, setRating] = useState<number | null>(null);
  const [view, setView] = useState<View>(mode === 'drawer-feedback' ? 'comment' : 'rating');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePrimary = async () => {
    if (mode === 'prompt' && view === 'rating') {
      if (rating === null) return;
      if (rating < 3) {
        setView('comment');
        return;
      }
    }
    setSubmitting(true);
    try {
      await onSubmit({ rating, comment: comment.trim() || null });
    } finally {
      setSubmitting(false);
    }
  };

  // In prompt mode, "Skip" on the low-rating comment view still submits the
  // rating (without a comment) so we never silently drop a star. In all other
  // cases secondary is a plain cancel.
  const handleSecondary = async () => {
    if (mode === 'prompt' && view === 'comment' && rating !== null) {
      setSubmitting(true);
      try {
        await onSubmit({ rating, comment: null });
      } finally {
        setSubmitting(false);
      }
      return;
    }
    onCancel?.();
  };

  const canSubmit = (() => {
    if (submitting) return false;
    if (mode === 'prompt' && view === 'rating') return rating !== null;
    if (mode === 'drawer-feedback') return rating !== null || comment.trim().length > 0;
    return true;
  })();

  const showRating = view === 'rating' || mode === 'drawer-feedback';
  const showComment = view === 'comment' || mode === 'drawer-feedback';

  const heading = view === 'comment' && mode === 'prompt' ? "Sorry — what's missing?" : title;

  return (
    <div className={styles.form}>
      <MuiTypography variant="subtitle1" component="h2" fontWeight={600} className={styles.title} id={resolvedTitleId}>
        {heading}
      </MuiTypography>

      {showRating && (
        <div className={styles.rating}>
          <InlineStarPicker quality={rating} onSelect={setRating} />
        </div>
      )}

      {showComment && (
        <TextField
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={mode === 'prompt' ? 'Tell us what would help' : "What's on your mind?"}
          multiline
          minRows={3}
          maxRows={6}
          fullWidth
          size="small"
          slotProps={{ htmlInput: { maxLength: 2000 } }}
          className={styles.comment}
        />
      )}

      <div className={styles.actions}>
        {onCancel && (
          <MuiButton onClick={handleSecondary} disabled={submitting} size="small">
            {view === 'comment' && mode === 'prompt' ? 'Skip' : 'Cancel'}
          </MuiButton>
        )}
        <MuiButton variant="contained" onClick={handlePrimary} disabled={!canSubmit} size="small">
          {view === 'rating' && mode === 'prompt' && rating !== null && rating < 3 ? 'Next' : submitLabel}
        </MuiButton>
      </div>
    </div>
  );
};
