'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import StarIcon from '@mui/icons-material/Star';
import MoreHorizOutlined from '@mui/icons-material/MoreHorizOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import dynamic from 'next/dynamic';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { AscentFeedItem } from '@/app/lib/graphql/operations/ticks';
import type { BoardDetails, BoardName } from '@/app/lib/types';
import { AscentStatusIcon } from '@/app/components/ascent-status/ascent-status-icon';
import { ClimbActions } from '@/app/components/climb-actions';
import DrawerClimbHeader from '@/app/components/climb-card/drawer-climb-header';
import { useSwipeActions } from '@/app/hooks/use-swipe-actions';
import { useDrawerDragResize } from '@/app/hooks/use-drawer-drag-resize';
import { useIsDarkMode } from '@/app/hooks/use-is-dark-mode';
import { useGradeFormat } from '@/app/hooks/use-grade-format';
import { themeTokens } from '@/app/theme/theme-config';
import { getDefaultBoardConfig } from '@/app/lib/default-board-configs';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { getExcludedClimbActions } from '@/app/lib/climb-action-utils';
import AscentThumbnail from '@/app/components/activity-feed/ascent-thumbnail';
import LogbookInlineEdit from './logbook-inline-edit';
import { ascentFeedItemToClimb } from './ascent-to-climb';
import ascentStyles from '@/app/components/climb-card/ascent-status.module.css';
import tickStyles from '@/app/components/logbook/tick-controls.module.css';
import drawerCss from '@/app/components/swipeable-drawer/swipeable-drawer.module.css';
import styles from './logbook-feed-item.module.css';

const SwipeableDrawer = dynamic(() => import('../swipeable-drawer/swipeable-drawer'), { ssr: false });

dayjs.extend(relativeTime);

// Layout name mapping
const layoutNames: Record<string, string> = {
  'kilter-1': 'Kilter Original',
  'kilter-8': 'Kilter Homewall',
  'tension-9': 'Tension Classic',
  'tension-10': 'Tension 2 Mirror',
  'tension-11': 'Tension 2 Spray',
  'moonboard-1': 'MoonBoard 2010',
  'moonboard-2': 'MoonBoard 2016',
  'moonboard-3': 'MoonBoard 2024',
  'moonboard-4': 'MoonBoard Masters 2017',
  'moonboard-5': 'MoonBoard Masters 2019',
};

const getLayoutDisplayName = (boardType: string, layoutId: number | null): string => {
  if (layoutId === null) return boardType.charAt(0).toUpperCase() + boardType.slice(1);
  const key = `${boardType}-${layoutId}`;
  return layoutNames[key] || boardType.charAt(0).toUpperCase() + boardType.slice(1);
};

// Swipe thresholds
const SWIPE_THRESHOLD = 60;
const LONG_SWIPE_THRESHOLD = 150;
const MAX_SWIPE = 180;
const LEFT_ACTION_WIDTH = 120;
const RIGHT_ACTION_WIDTH = 120;

// Static styles
const iconStyle: React.CSSProperties = { color: 'white', fontSize: 20 };
const thumbnailStyle: React.CSSProperties = { width: themeTokens.spacing[16], flexShrink: 0, position: 'relative' };
const menuButtonStyle: React.CSSProperties = { flexShrink: 0, color: 'var(--neutral-400)' };
const noInteraction: React.CSSProperties = { pointerEvents: 'none' };

const gradeGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto auto auto',
  gap: 4,
  justifyItems: 'center',
  flexShrink: 0,
  paddingBottom: 6,
};

const commentBoxSx = {
  fontSize: themeTokens.typography.fontSize.xs,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  color: 'text.primary',
  backgroundColor: 'var(--neutral-100)',
  borderRadius: `${themeTokens.borderRadius.sm}px`,
  padding: `${themeTokens.spacing[1]}px ${themeTokens.spacing[2]}px`,
  marginTop: `${themeTokens.spacing[1]}px`,
} as const;

const nameSx = {
  fontSize: themeTokens.typography.fontSize.xl,
  fontWeight: themeTokens.typography.fontWeight.bold,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

const subtitleSx = {
  fontSize: themeTokens.typography.fontSize.xs,
  fontWeight: themeTokens.typography.fontWeight.normal,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

const actionsDrawerStyles = {
  wrapper: {
    width: '100%',
    touchAction: 'pan-y' as const,
    transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  body: { padding: `${themeTokens.spacing[2]}px 0` },
  header: { paddingLeft: `${themeTokens.spacing[3]}px`, paddingRight: `${themeTokens.spacing[3]}px` },
} as const;

// --- Sub-components ---

function LogbookGradeGrid({
  consensusDifficultyName,
  qualityAverage,
  difficultyName,
  quality,
  attemptCount,
}: {
  consensusDifficultyName: string | null;
  qualityAverage: number | null;
  difficultyName: string | null;
  quality: number | null;
  attemptCount: number;
}) {
  const isDark = useIsDarkMode();
  const { formatGrade, getGradeColor } = useGradeFormat();

  const consensusFormatted = consensusDifficultyName ? formatGrade(consensusDifficultyName) : null;
  const consensusColor = consensusDifficultyName ? getGradeColor(consensusDifficultyName, isDark) : undefined;
  const consensusLabel = consensusFormatted ?? consensusDifficultyName ?? '—';
  const consensusStarsLabel = qualityAverage != null ? Math.round(qualityAverage).toString() : '—';

  const userFormatted = difficultyName ? formatGrade(difficultyName) : null;
  const userColor = difficultyName ? getGradeColor(difficultyName, isDark) : undefined;
  const userLabel = userFormatted ?? (difficultyName || '—');

  return (
    <div style={gradeGridStyle}>
      {/* Row 1: consensus — empty tries cell, consensus stars, consensus grade */}
      <div />
      <div className={tickStyles.starButton} style={noInteraction}>
        <StarIcon sx={{ fontSize: 14, color: qualityAverage ? themeTokens.colors.amber : 'inherit' }} />
        <span className={tickStyles.starNumber}>{consensusStarsLabel}</span>
        <span className={tickStyles.starLabel}>stars</span>
      </div>
      <div className={tickStyles.gradeButton} style={noInteraction}>
        <span
          className={tickStyles.gradeNumber}
          {...(consensusColor ? { style: { '--grade-color': consensusColor } as React.CSSProperties } : {})}
        >
          {consensusLabel}
        </span>
        <span className={tickStyles.gradeByline}>grade</span>
      </div>

      {/* Row 2: user — tries, user stars, user grade */}
      <div className={tickStyles.attemptButton} style={noInteraction}>
        <span className={tickStyles.attemptNumber}>{attemptCount}</span>
        <span className={tickStyles.attemptLabel}>tries</span>
      </div>
      <div className={tickStyles.starButton} style={noInteraction}>
        <StarIcon sx={{ fontSize: 14, color: quality ? themeTokens.colors.amber : 'inherit' }} />
        <span className={tickStyles.starNumber}>{quality ?? '—'}</span>
        <span className={tickStyles.starLabel}>stars</span>
      </div>
      <div className={tickStyles.gradeButton} style={noInteraction}>
        <span
          className={tickStyles.gradeNumber}
          {...(userColor ? { style: { '--grade-color': userColor } as React.CSSProperties } : {})}
        >
          {userLabel}
        </span>
        <span className={tickStyles.gradeByline}>user</span>
      </div>
    </div>
  );
}

// --- Main component ---

interface LogbookFeedItemProps {
  item: AscentFeedItem;
  showBoardType?: boolean;
  isEditing?: boolean;
  onEdit?: (item: AscentFeedItem) => void;
  onDelete?: (uuid: string) => void;
  onCancelEdit?: () => void;
  /** When true, show "Post to Instagram" option in the actions menu. */
  allowInstagramPosting?: boolean;
  /** When true, show "Link Instagram post" option in the actions menu. */
  allowInstagramLinking?: boolean;
}

const LogbookFeedItem: React.FC<LogbookFeedItemProps> = React.memo(({
  item,
  showBoardType,
  isEditing,
  onEdit,
  onDelete,
  onCancelEdit,
  // Instagram props accepted but not yet integrated into the new standalone layout
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  allowInstagramPosting: _allowInstagramPosting,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  allowInstagramLinking: _allowInstagramLinking,
}) => {
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // Map ascent to Climb for ClimbActions
  const climb = useMemo(() => ascentFeedItemToClimb(item), [item]);

  // Build BoardDetails for ClimbActions (same pattern as AscentThumbnail)
  const boardDetails = useMemo<BoardDetails | null>(() => {
    if (!item.layoutId) return null;
    const boardName = item.boardType as BoardName;
    const config = getDefaultBoardConfig(boardName, item.layoutId);
    if (!config) return null;
    try {
      return getBoardDetailsForBoard({
        board_name: boardName,
        layout_id: item.layoutId,
        size_id: config.sizeId,
        set_ids: config.setIds,
      });
    } catch {
      return null;
    }
  }, [item.boardType, item.layoutId]);

  const excludeActions = useMemo(
    () => boardDetails ? getExcludedClimbActions(boardDetails.board_name, 'list') : [],
    [boardDetails],
  );

  // Subtitle: "2h ago · 40° · Kilter Original"
  const subtitle = useMemo(() => {
    const parts: string[] = [];
    parts.push(dayjs(item.climbedAt).fromNow());
    parts.push(`${item.angle}\u00B0`);
    if (showBoardType) {
      parts.push(getLayoutDisplayName(item.boardType, item.layoutId));
    }
    return parts.join(' \u00b7 ');
  }, [item.climbedAt, item.angle, showBoardType, item.boardType, item.layoutId]);

  // --- Swipe actions ---
  const leftSwipeLayerRef = useRef<HTMLDivElement>(null);
  const rightSwipeLayerRef = useRef<HTMLDivElement>(null);

  const handleSwipeRight = useCallback(() => {
    onEdit?.(item);
  }, [onEdit, item]);

  const handleSwipeLeftLong = useCallback(() => {
    onDelete?.(item.uuid);
  }, [onDelete, item.uuid]);

  const handleSwipeOffset = useCallback((offset: number) => {
    if (leftSwipeLayerRef.current) {
      leftSwipeLayerRef.current.style.opacity = String(Math.min(1, Math.max(0, offset) / SWIPE_THRESHOLD));
    }
    if (rightSwipeLayerRef.current) {
      rightSwipeLayerRef.current.style.opacity = String(Math.min(1, Math.max(0, -offset) / SWIPE_THRESHOLD));
    }
  }, []);

  const { swipeHandlers, contentRef, leftActionRef, rightActionRef } = useSwipeActions({
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeftLong,
    onSwipeOffsetChange: handleSwipeOffset,
    swipeThreshold: SWIPE_THRESHOLD,
    longSwipeRightThreshold: LONG_SWIPE_THRESHOLD,
    maxSwipe: MAX_SWIPE,
    maxSwipeLeft: RIGHT_ACTION_WIDTH,
    maxSwipeRight: LEFT_ACTION_WIDTH,
    disabled: isEditing,
  });

  const leftActionCombinedRef = useCallback((node: HTMLDivElement | null) => {
    leftActionRef(node);
    leftSwipeLayerRef.current = node;
  }, [leftActionRef]);

  const contentCombinedRef = useCallback((node: HTMLDivElement | null) => {
    swipeHandlers.ref(node);
    contentRef(node);
  }, [swipeHandlers, contentRef]);

  // --- Actions drawer ---
  const handleOpenActions = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActionsOpen(true);
  }, []);

  const handleCloseActions = useCallback(() => {
    setIsActionsOpen(false);
  }, []);

  const { paperRef: actionsPaperRef, dragHandlers: actionsDragHandlers } = useDrawerDragResize({
    open: isActionsOpen,
    onClose: handleCloseActions,
  });

  const handleDrawerEdit = useCallback(() => {
    handleCloseActions();
    onEdit?.(item);
  }, [handleCloseActions, onEdit, item]);

  const handleDrawerDelete = useCallback(() => {
    handleCloseActions();
    onDelete?.(item.uuid);
  }, [handleCloseActions, onDelete, item.uuid]);

  return (
    <>
      <div className={styles.container}>
        {/* Left action layer — Edit (revealed on swipe right) */}
        <div ref={leftActionCombinedRef} className={styles.leftActionLayer}>
          <EditOutlined style={iconStyle} />
        </div>

        {/* Right action layer — Delete (revealed on swipe left) */}
        <div ref={rightActionRef} className={styles.rightActionLayer}>
          <DeleteOutlined style={iconStyle} />
        </div>

        {/* Swipeable content */}
        <div
          {...swipeHandlers}
          ref={contentCombinedRef}
          className={styles.content}
          data-swipe-content=""
        >
          {/* Thumbnail with ascent status badge */}
          <div style={thumbnailStyle}>
            {item.frames && item.layoutId && (
              <AscentThumbnail
                boardType={item.boardType}
                layoutId={item.layoutId}
                angle={item.angle}
                climbUuid={item.climbUuid}
                climbName={item.climbName}
                frames={item.frames}
                isMirror={item.isMirror}
              />
            )}
            <AscentStatusIcon
              status={item.status}
              variant="badge"
              fontSize={12}
              className={ascentStyles.badge}
            />
          </div>

          {/* Center section */}
          <div className={styles.center}>
            <div className={styles.titleRow}>
              <div className={styles.nameColumn}>
                <Typography variant="body2" component="span" sx={nameSx}>
                  {item.climbName}
                </Typography>
                <Typography variant="body2" component="span" color="text.secondary" sx={subtitleSx}>
                  {subtitle}
                </Typography>
              </div>
              <LogbookGradeGrid
                consensusDifficultyName={item.consensusDifficultyName}
                qualityAverage={item.qualityAverage}
                difficultyName={item.difficultyName}
                quality={item.quality}
                attemptCount={item.attemptCount}
              />
            </div>
            {item.comment && (
              <Typography sx={commentBoxSx}>
                {item.comment}
              </Typography>
            )}
          </div>

          {/* Ellipsis menu button */}
          <IconButton
            size="small"
            aria-label="More actions"
            onClick={handleOpenActions}
            style={menuButtonStyle}
            disableRipple
          >
            <MoreHorizOutlined />
          </IconButton>
        </div>

        {/* Inline edit (below content when editing) */}
        {isEditing && onCancelEdit && (
          <LogbookInlineEdit item={item} onClose={onCancelEdit} />
        )}
      </div>

      {/* Actions drawer */}
      {boardDetails && (
        <SwipeableDrawer
          title={
            <div data-swipe-blocked="" {...actionsDragHandlers} className={drawerCss.dragHeaderWrapper}>
              <DrawerClimbHeader climb={climb} boardDetails={boardDetails} />
            </div>
          }
          placement="bottom"
          height="60%"
          paperRef={actionsPaperRef}
          open={isActionsOpen}
          onClose={handleCloseActions}
          swipeEnabled={false}
          styles={actionsDrawerStyles}
        >
          {/* Edit + Delete at top */}
          {onEdit && (
            <MenuItem onClick={handleDrawerEdit}>
              <ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
          )}
          {onDelete && (
            <MenuItem onClick={handleDrawerDelete} sx={{ color: 'error.main' }}>
              <ListItemIcon><DeleteOutlined sx={{ color: 'error.main' }} fontSize="small" /></ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          )}
          {(onEdit || onDelete) && <Divider />}
          {/* Standard climb actions */}
          <ClimbActions
            climb={climb}
            boardDetails={boardDetails}
            angle={item.angle}
            viewMode="list"
            exclude={excludeActions}
            onActionComplete={handleCloseActions}
          />
        </SwipeableDrawer>
      )}
    </>
  );
});

LogbookFeedItem.displayName = 'LogbookFeedItem';

export default LogbookFeedItem;
