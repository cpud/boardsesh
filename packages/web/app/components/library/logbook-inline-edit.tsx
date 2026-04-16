'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { themeTokens } from '@/app/theme/theme-config';
import { useUpdateTick } from '@/app/hooks/use-update-tick';
import type { AscentFeedItem } from '@/app/lib/graphql/operations/ticks';
import {
  TickControls,
  TickGradeButton,
  InlineStarPicker,
  InlineGradePicker,
  InlineTriesPicker,
  type ExpandedControl,
} from '../logbook/tick-controls';
import styles from './logbook-inline-edit.module.css';

interface LogbookInlineEditProps {
  item: AscentFeedItem;
  onClose: () => void;
}

function getEditedAscentStatus(item: AscentFeedItem, attemptCount: number): 'flash' | 'send' {
  if (attemptCount > 1) {
    return 'send';
  }
  // Preserve one-try sends (don't auto-promote to flash)
  if (item.status === 'send' && item.attemptCount === 1) {
    return 'send';
  }
  return 'flash';
}

export default function LogbookInlineEdit({ item, onClose }: LogbookInlineEditProps) {
  const updateTick = useUpdateTick();
  const grades = TENSION_KILTER_GRADES;

  const [comment, setComment] = useState('');
  const [commentFocused, setCommentFocused] = useState(false);
  const [quality, setQuality] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<number | undefined>(undefined);
  const [attemptCount, setAttemptCount] = useState(1);
  const [expandedControl, setExpandedControl] = useState<ExpandedControl>(null);
  const [lastExpandedControl, setLastExpandedControl] = useState<ExpandedControl>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const gradeButtonRef = useRef<HTMLButtonElement>(null);
  const triesButtonRef = useRef<HTMLButtonElement>(null);

  // Initialize state from item
  useEffect(() => {
    setComment(item.comment);
    setCommentFocused(false);
    setQuality(item.quality ?? null);
    setDifficulty(item.difficulty ?? undefined);
    setAttemptCount(item.attemptCount);
    setExpandedControl(null);
    setLastExpandedControl(null);
    setPickerVisible(false);
  }, [item]);

  // Track picker visibility for collapse animation
  useEffect(() => {
    if (expandedControl) {
      setLastExpandedControl(expandedControl);
      setPickerVisible(true);
      return;
    }

    const timer = window.setTimeout(() => setPickerVisible(false), 200);
    return () => window.clearTimeout(timer);
  }, [expandedControl]);

  const renderedControl = expandedControl ?? (pickerVisible ? lastExpandedControl : null);
  const currentGradeId = difficulty;
  const focusGradeId = difficulty ?? item.consensusDifficulty ?? undefined;

  const handleStarSelect = useCallback((value: number | null) => {
    setQuality(value);
    setExpandedControl(null);
  }, []);

  const handleGradeSelect = useCallback((value: number | undefined) => {
    setDifficulty(value);
    setExpandedControl(null);
  }, []);

  const handleTriesSelect = useCallback((value: number) => {
    setAttemptCount(value);
    setExpandedControl(null);
  }, []);

  const handleCommentFocus = useCallback(() => {
    setExpandedControl(null);
    setCommentFocused(true);
  }, []);

  const handleCommentBlur = useCallback(() => {
    setCommentFocused(false);
  }, []);

  const handleSaveAttempt = useCallback(async () => {
    try {
      await updateTick.mutateAsync({
        uuid: item.uuid,
        input: {
          status: 'attempt',
          attemptCount,
          quality: null,
          difficulty: difficulty ?? null,
          comment,
        },
      });
      onClose();
    } catch {
      // The mutation hook surfaces the error via snackbar; keep edit open.
    }
  }, [attemptCount, comment, difficulty, item.uuid, onClose, updateTick]);

  const handleSaveAscent = useCallback(async () => {
    try {
      await updateTick.mutateAsync({
        uuid: item.uuid,
        input: {
          status: getEditedAscentStatus(item, attemptCount),
          attemptCount,
          quality: quality ?? null,
          difficulty: difficulty ?? null,
          comment,
        },
      });
      onClose();
    } catch {
      // The mutation hook surfaces the error via snackbar; keep edit open.
    }
  }, [attemptCount, comment, difficulty, item, onClose, quality, updateTick]);

  return (
    <div className={styles.editWrapper}>
      <div className={styles.editInner}>
        {/* Picker panel — expands above the controls row */}
        <div className={`${styles.pickerPanel} ${expandedControl ? styles.pickerPanelExpanded : ''}`}>
          <div className={styles.pickerPanelContent}>
            {renderedControl === 'stars' && (
              <InlineStarPicker quality={quality} onSelect={handleStarSelect} />
            )}
            {renderedControl === 'grade' && (
              <InlineGradePicker
                grades={grades}
                currentGradeId={currentGradeId}
                focusGradeId={focusGradeId}
                onSelect={handleGradeSelect}
                gradeButtonRef={gradeButtonRef}
              />
            )}
            {renderedControl === 'tries' && (
              <InlineTriesPicker
                attemptCount={attemptCount}
                onSelect={handleTriesSelect}
                triesButtonRef={triesButtonRef}
              />
            )}
          </div>
        </div>

        {/* Controls row */}
        <div className={styles.controlsRow}>
          <div className={styles.leftSection}>
            <div className={styles.commentWrapper}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Comment..."
                multiline
                minRows={1}
                maxRows={commentFocused ? 4 : 1}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                onFocus={handleCommentFocus}
                onBlur={handleCommentBlur}
                slotProps={{
                  htmlInput: { maxLength: 2000, 'aria-label': 'Edit tick comment' },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <ChatBubbleOutlineOutlined sx={{ fontSize: 16, opacity: 0.5 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    backgroundColor: 'var(--input-bg)',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--neutral-200)',
                    },
                  },
                }}
              />
            </div>
            <TickGradeButton
              ref={gradeButtonRef}
              difficulty={difficulty}
              displayedGrades={grades}
              expandedControl={expandedControl}
              onExpandedControlChange={setExpandedControl}
            />
            <TickControls
              quality={quality}
              attemptCount={attemptCount}
              expandedControl={expandedControl}
              onExpandedControlChange={setExpandedControl}
              triesButtonRef={triesButtonRef}
            />
          </div>
          <div className={styles.rightButtons}>
            <IconButton
              size="small"
              onClick={handleSaveAscent}
              disabled={updateTick.isPending}
              aria-label="Save as ascent"
              sx={{
                width: 36,
                height: 36,
                backgroundColor: themeTokens.colors.success,
                color: 'common.white',
                '&:hover': { backgroundColor: themeTokens.colors.success },
              }}
            >
              <CheckOutlined sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleSaveAttempt}
              disabled={updateTick.isPending}
              aria-label="Save as attempt"
              sx={{
                width: 36,
                height: 36,
                backgroundColor: themeTokens.colors.error,
                color: 'common.white',
                '&:hover': { backgroundColor: themeTokens.colors.error },
              }}
            >
              <CloseOutlined sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Cancel editing"
              sx={{
                width: 28,
                height: 28,
                color: 'text.disabled',
              }}
            >
              <CloseOutlined sx={{ fontSize: 16 }} />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}
