import React, { useRef, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BoardDetails, Climb } from '@/app/lib/types';
import BoardRenderer from '../board-renderer/board-renderer';
import { getContextAwareClimbViewUrl } from '@/app/lib/url-utils';
import { convertLitUpHoldsStringToMap, getImageUrl, buildOverlayUrl, isRustRendererEnabled } from '@/app/components/board-renderer/util';

type ClimbThumbnailProps = {
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
  enableNavigation?: boolean;
  onNavigate?: () => void;
  maxHeight?: string;
};

const placeholderStyle = (boardDetails: BoardDetails, maxHeight?: string): React.CSSProperties => ({
  width: '100%',
  aspectRatio: `${boardDetails.boardWidth}/${boardDetails.boardHeight}`,
  maxHeight: maxHeight ?? '10vh',
  background: 'var(--neutral-200)',
  borderRadius: 4,
});

const ClimbThumbnail = ({ boardDetails, currentClimb, enableNavigation = false, onNavigate, maxHeight }: ClimbThumbnailProps) => {
  const pathname = usePathname();
  const litUpHoldsMap = useMemo(
    () => currentClimb && !isRustRendererEnabled ? convertLitUpHoldsStringToMap(currentClimb.frames, boardDetails.board_name)[0] : undefined,
    [currentClimb?.frames, boardDetails.board_name],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Native loading="lazy" handles lazy loading for the rust renderer
    if (isRustRendererEnabled) {
      setIsVisible(true);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!isVisible) {
    return <div ref={containerRef} style={placeholderStyle(boardDetails, maxHeight)} />;
  }

  // Rust WASM renderer: layered background images + overlay
  const renderContent = isRustRendererEnabled && currentClimb ? (
    <RustRenderedBoard
      boardDetails={boardDetails}
      frames={currentClimb.frames}
      mirrored={!!currentClimb.mirrored}
      maxHeight={maxHeight}
    />
  ) : (
    <BoardRenderer
      litUpHoldsMap={litUpHoldsMap}
      mirrored={!!currentClimb?.mirrored}
      boardDetails={boardDetails}
      thumbnail
      maxHeight={maxHeight}
    />
  );

  if (enableNavigation && currentClimb) {
    const climbViewUrl = getContextAwareClimbViewUrl(
      pathname,
      boardDetails,
      currentClimb.angle,
      currentClimb.uuid,
      currentClimb.name,
    );

    return (
      <div ref={containerRef}>
        <Link href={climbViewUrl} prefetch={false} onClick={() => onNavigate?.()} data-testid="climb-thumbnail-link">
          {renderContent}
        </Link>
      </div>
    );
  }

  return <div ref={containerRef}>{renderContent}</div>;
};

const thumbnailLayerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
};

/**
 * Renders a board using the Rust WASM overlay approach:
 * - Background: static board images (cached per board config, shared across all climbs)
 * - Overlay: transparent PNG with hold circles (cached per climb, immutable)
 */
const RustRenderedBoard = React.memo(function RustRenderedBoard({
  boardDetails,
  frames,
  mirrored,
  maxHeight,
}: {
  boardDetails: BoardDetails;
  frames: string;
  mirrored: boolean;
  maxHeight?: string;
}) {
  const overlayUrl = buildOverlayUrl(boardDetails, frames, mirrored);
  const backgroundUrls = useMemo(
    () => Object.keys(boardDetails.images_to_holds).map((img) => getImageUrl(img, boardDetails.board_name)),
    [boardDetails.images_to_holds, boardDetails.board_name],
  );

  const containerStyle = useMemo<React.CSSProperties>(() => ({
    position: 'relative',
    aspectRatio: `${boardDetails.boardWidth} / ${boardDetails.boardHeight}`,
    maxHeight: maxHeight ?? '10vh',
    width: 'auto',
    height: '100%',
  }), [boardDetails.boardWidth, boardDetails.boardHeight, maxHeight]);

  return (
    <div style={containerStyle}>
      {backgroundUrls.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" style={thumbnailLayerStyle} loading="lazy" />
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={overlayUrl} alt="" style={thumbnailLayerStyle} loading="lazy" />
    </div>
  );
});

export default ClimbThumbnail;
