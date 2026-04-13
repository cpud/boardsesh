'use client';

import { useCallback, useEffect, useRef } from 'react';

export const DRAG_MOVE_THRESHOLD = 10;
export const DRAG_SNAP_THRESHOLD = 30;
export const DRAG_CLOSE_THRESHOLD = 120;

export type DragResult = 'expand' | 'collapse' | 'close' | 'none';

/** Pure decision function: determines if finger movement qualifies as a drag gesture. */
export function isDragGestureDetected(startY: number, currentY: number, threshold = DRAG_MOVE_THRESHOLD): boolean {
  return Math.abs(currentY - startY) > threshold;
}

/** Pure decision function: given a drag delta and starting height, returns the drawer action. */
export function computeDragResult(
  deltaY: number,
  startHeight: string,
  isGesture: boolean,
  expandedHeight = '90%',
  threshold = DRAG_SNAP_THRESHOLD,
  closeThreshold = DRAG_CLOSE_THRESHOLD,
): DragResult {
  if (!isGesture) return 'none';
  if (deltaY < -threshold) return 'expand';
  if (deltaY > closeThreshold) return 'close';
  if (deltaY > threshold) {
    return startHeight === expandedHeight ? 'collapse' : 'close';
  }
  return 'none';
}

export interface DrawerDragResizeOptions {
  /** Whether the drawer is currently open. Height resets to initialHeight when false. */
  open: boolean;
  /** Called when a drag-down from the initial height should close the drawer. */
  onClose: () => void;
  /** Initial/collapsed height. Defaults to '60%'. */
  initialHeight?: string;
  /** Expanded height. Defaults to '90%'. */
  expandedHeight?: string;
}

export interface DrawerDragResizeResult {
  /** Ref to forward to SwipeableDrawer's paperRef prop. */
  paperRef: React.RefObject<HTMLDivElement | null>;
  /** Touch handlers to spread onto the drag header zone element. */
  dragHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
}

/**
 * Hook that implements Spotify-style drag-to-resize for bottom drawers.
 *
 * Drag up → expand to 90%.
 * Drag down from expanded → collapse to initial height (60%).
 * Drag down from initial height → close.
 */
export function useDrawerDragResize({
  open,
  onClose,
  initialHeight = '60%',
  expandedHeight = '90%',
}: DrawerDragResizeOptions): DrawerDragResizeResult {
  const paperRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(initialHeight);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(initialHeight);
  const isDragGesture = useRef(false);

  const updateHeight = useCallback((height: string) => {
    heightRef.current = height;
    if (paperRef.current) {
      paperRef.current.style.height = height;
    }
  }, []);

  // Reset height when drawer closes
  useEffect(() => {
    if (!open) {
      updateHeight(initialHeight);
    }
  }, [open, initialHeight, updateHeight]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = heightRef.current;
    isDragGesture.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (Math.abs(e.touches[0].clientY - dragStartY.current) > DRAG_MOVE_THRESHOLD) {
      isDragGesture.current = true;
    }
  }, []);

  const scrollToTop = useCallback(() => {
    const paper = paperRef.current;
    if (!paper) return;
    for (const el of paper.querySelectorAll<HTMLElement>('*')) {
      const overflow = getComputedStyle(el).overflowY;
      if ((overflow === 'auto' || overflow === 'scroll') && el.scrollTop > 0) {
        el.scrollTop = 0;
        break;
      }
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragGesture.current) return;
    const deltaY = e.changedTouches[0].clientY - dragStartY.current;
    const result = computeDragResult(deltaY, dragStartHeight.current, true, expandedHeight);
    switch (result) {
      case 'expand':
        updateHeight(expandedHeight);
        break;
      case 'collapse':
        updateHeight(initialHeight);
        // Scroll content back to top so auto-expand doesn't immediately re-trigger
        scrollToTop();
        break;
      case 'close':
        onClose();
        break;
    }
  }, [onClose, initialHeight, expandedHeight, updateHeight, scrollToTop]);

  // Auto-expand when the user scrolls content inside the drawer.
  // Find the scroll container (element with overflow auto/scroll) inside the paper.
  useEffect(() => {
    if (!open) return;
    const paper = paperRef.current;
    if (!paper) return;

    // Find the scrollable body element — SwipeableDrawer renders a Box with overflow: auto
    let scrollEl: HTMLElement | null = null;
    const candidates = paper.querySelectorAll<HTMLElement>('*');
    for (const el of candidates) {
      const overflow = getComputedStyle(el).overflowY;
      if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) {
        scrollEl = el;
        break;
      }
    }
    // Fallback: even if not yet scrollable, find the body box by overflow style
    if (!scrollEl) {
      for (const el of candidates) {
        const overflow = getComputedStyle(el).overflowY;
        if (overflow === 'auto' || overflow === 'scroll') {
          scrollEl = el;
          break;
        }
      }
    }
    if (!scrollEl) return;

    const handleScroll = () => {
      if (heightRef.current !== expandedHeight && scrollEl!.scrollTop > 0) {
        updateHeight(expandedHeight);
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl!.removeEventListener('scroll', handleScroll);
  }, [open, expandedHeight, updateHeight]);

  return {
    paperRef,
    dragHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
