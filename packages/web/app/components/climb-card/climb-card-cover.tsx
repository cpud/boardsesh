'use client';
import React, { useMemo } from 'react';
import type { Climb, BoardDetails } from '@/app/lib/types';
import BoardRenderer from '@/app/components/board-renderer/board-renderer';
import { useDoubleTap } from '@/app/lib/hooks/use-double-tap';
import { convertLitUpHoldsStringToMap, getImageUrl, buildOverlayUrl, isRustRendererEnabled } from '@/app/components/board-renderer/util';

const coverLayerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
};

type ClimbCardCoverProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
  onClick?: () => void;
  onDoubleClick?: () => void;
};

const ClimbCardCover = ({ climb, boardDetails, onClick, onDoubleClick }: ClimbCardCoverProps) => {
  const { ref, onDoubleClick: handleDoubleClick } = useDoubleTap(onDoubleClick);
  const litUpHoldsMap = useMemo(
    () => climb && !isRustRendererEnabled ? convertLitUpHoldsStringToMap(climb.frames, boardDetails.board_name)[0] : undefined,
    [climb?.frames, boardDetails.board_name],
  );

  const renderContent = isRustRendererEnabled && climb ? (
    <RustRenderedCover boardDetails={boardDetails} frames={climb.frames} mirrored={!!climb.mirrored} />
  ) : (
    <BoardRenderer boardDetails={boardDetails} litUpHoldsMap={litUpHoldsMap} mirrored={!!climb?.mirrored} />
  );

  return (
    <div
      ref={ref}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      style={{
        width: '100%',
        height: 'auto',
        position: 'relative',
        cursor: onClick || onDoubleClick ? 'pointer' : 'default',
      }}
    >
      {renderContent}
    </div>
  );
};

const RustRenderedCover = React.memo(function RustRenderedCover({
  boardDetails,
  frames,
  mirrored,
}: {
  boardDetails: BoardDetails;
  frames: string;
  mirrored: boolean;
}) {
  const overlayUrl = buildOverlayUrl(boardDetails, frames);
  const backgroundUrls = useMemo(
    () => Object.keys(boardDetails.images_to_holds).map((img) => getImageUrl(img, boardDetails.board_name)),
    [boardDetails.images_to_holds, boardDetails.board_name],
  );

  const containerStyle = useMemo<React.CSSProperties>(() => ({
    position: 'relative',
    aspectRatio: `${boardDetails.boardWidth} / ${boardDetails.boardHeight}`,
    width: '100%',
    transform: mirrored ? 'scaleX(-1)' : undefined,
  }), [boardDetails.boardWidth, boardDetails.boardHeight, mirrored]);

  return (
    <div style={containerStyle}>
      {backgroundUrls.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" style={coverLayerStyle} />
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={overlayUrl} alt="" style={coverLayerStyle} />
    </div>
  );
});

export default ClimbCardCover;
