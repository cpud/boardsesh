'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { BoardDetails, BoardName } from '@/app/lib/types';
import BoardRenderer from '@/app/components/board-renderer/board-renderer';
import { convertLitUpHoldsStringToMap, getImageUrl, buildOverlayUrl, isRustRendererEnabled } from '@/app/components/board-renderer/util';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { getDefaultBoardConfig } from '@/app/lib/default-board-configs';
import { constructClimbViewUrlWithSlugs, constructClimbViewUrl } from '@/app/lib/url-utils';
import styles from './ascents-feed.module.css';

interface AscentThumbnailProps {
  boardType: string;
  layoutId: number | null;
  angle: number;
  climbUuid: string;
  climbName: string;
  frames: string | null;
  isMirror: boolean;
}

const AscentThumbnail: React.FC<AscentThumbnailProps> = ({
  boardType,
  layoutId,
  angle,
  climbUuid,
  climbName,
  frames,
  isMirror,
}) => {
  // Memoize board details to avoid recomputing on every render
  const boardDetails = useMemo<BoardDetails | null>(() => {
    if (!layoutId) return null;

    const boardName = boardType as BoardName;
    const config = getDefaultBoardConfig(boardName, layoutId);
    if (!config) return null;

    try {
      return getBoardDetailsForBoard({
        board_name: boardName,
        layout_id: layoutId,
        size_id: config.sizeId,
        set_ids: config.setIds,
      });
    } catch (error) {
      console.error('Failed to get board details for thumbnail:', error);
      return null;
    }
  }, [boardType, layoutId]);

  // Memoize lit up holds map (only needed for legacy SVG renderer)
  const litUpHoldsMap = useMemo(() => {
    if (isRustRendererEnabled) return undefined;
    if (!frames || !boardType) return undefined;
    const framesData = convertLitUpHoldsStringToMap(frames, boardType as BoardName);
    return framesData[0];
  }, [frames, boardType]);

  // Get climb view path (prefer friendly slugs)
  const climbViewPath = useMemo(() => {
    if (!layoutId) return null;

    const config = getDefaultBoardConfig(boardType as BoardName, layoutId);
    if (config) {
      const details = getBoardDetailsForBoard({
        board_name: boardType as BoardName,
        layout_id: layoutId,
        size_id: config.sizeId,
        set_ids: config.setIds,
      });
      if (details?.layout_name && details.size_name && details.set_names) {
        return constructClimbViewUrlWithSlugs(
          details.board_name,
          details.layout_name,
          details.size_name,
          details.size_description,
          details.set_names,
          angle,
          climbUuid,
          climbName,
        );
      }
    }

    // Fallback to numeric path
    return constructClimbViewUrl(
      {
        board_name: boardType as BoardName,
        layout_id: layoutId,
        size_id: config?.sizeId ?? 1,
        set_ids: config?.setIds ?? [],
        angle,
      },
      climbUuid,
      climbName,
    );
  }, [boardType, layoutId, angle, climbUuid, climbName]);

  // If we can't render the thumbnail, don't show anything
  if (!boardDetails || !climbViewPath) {
    return null;
  }
  if (!isRustRendererEnabled && !litUpHoldsMap) {
    return null;
  }

  const thumbnailContent = isRustRendererEnabled && frames ? (
    <RustRenderedAscentThumbnail boardDetails={boardDetails} frames={frames} mirrored={isMirror} />
  ) : (
    <BoardRenderer
      boardDetails={boardDetails}
      litUpHoldsMap={litUpHoldsMap}
      mirrored={isMirror}
      thumbnail
    />
  );

  return (
    <Link
      href={climbViewPath}
      className={styles.thumbnailLink}
      title={`View ${climbName}`}
    >
      <div className={styles.thumbnailContainer}>
        {thumbnailContent}
      </div>
    </Link>
  );
};

const ascentLayerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
};

const RustRenderedAscentThumbnail = React.memo(function RustRenderedAscentThumbnail({
  boardDetails,
  frames,
  mirrored,
}: {
  boardDetails: BoardDetails;
  frames: string;
  mirrored: boolean;
}) {
  const overlayUrl = buildOverlayUrl(boardDetails, frames, mirrored);
  const backgroundUrls = useMemo(
    () => Object.keys(boardDetails.images_to_holds).map((img) => getImageUrl(img, boardDetails.board_name)),
    [boardDetails.images_to_holds, boardDetails.board_name],
  );

  const containerStyle = useMemo<React.CSSProperties>(() => ({
    position: 'relative',
    aspectRatio: `${boardDetails.boardWidth} / ${boardDetails.boardHeight}`,
    width: '100%',
    height: '100%',
  }), [boardDetails.boardWidth, boardDetails.boardHeight]);

  return (
    <div style={containerStyle}>
      {backgroundUrls.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" style={ascentLayerStyle} loading="lazy" />
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={overlayUrl} alt="" style={ascentLayerStyle} loading="lazy" />
    </div>
  );
});

export default AscentThumbnail;
