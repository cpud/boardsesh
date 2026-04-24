'use client';

import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import { FeedbackForm } from './feedback-form';
import { useSubmitAppFeedback } from '@/app/hooks/use-submit-app-feedback';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { setFeedbackStatus } from '@/app/lib/feedback-prompt-db';
import type { AppFeedbackSource } from '@boardsesh/shared-schema';
import styles from './feedback-dialog.module.css';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  source: AppFeedbackSource;
  title?: string;
}

const FeedbackDialogBody: React.FC<Omit<FeedbackDialogProps, 'open'>> = ({
  onClose,
  source,
  title = 'Send feedback',
}) => {
  const { mutate } = useSubmitAppFeedback();
  const { showMessage } = useSnackbar();

  const handleSubmit = (values: { rating: number | null; comment: string | null }) => {
    if (values.rating === null && !values.comment) {
      onClose();
      return;
    }
    // Suppress the automatic banner for users who manually engaged.
    void setFeedbackStatus('submitted');
    mutate(
      {
        rating: values.rating ?? 0,
        comment: values.comment,
        source,
      },
      {
        onSuccess: () => showMessage('Thanks — logged.', 'success'),
        onError: () => showMessage("Couldn't send — we'll keep your feedback.", 'warning'),
      },
    );
    onClose();
  };

  return (
    <>
      <IconButton aria-label="Close" onClick={onClose} className={styles.closeButton} size="small">
        <CloseOutlined fontSize="small" />
      </IconButton>
      <DialogContent>
        <FeedbackForm
          mode="drawer-feedback"
          title={title}
          submitLabel="Send"
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </>
  );
};

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ open, onClose, source, title }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {open && <FeedbackDialogBody onClose={onClose} source={source} title={title} />}
    </Dialog>
  );
};
