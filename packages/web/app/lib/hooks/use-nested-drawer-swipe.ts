'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Custom swipe-to-close for nested disablePortal drawers.
 * MUI's built-in swipe doesn't work for these because the parent drawer's
 * document-level touchstart handler claims the touch first. This hook
 * attaches native event listeners directly to the Paper element so the
 * entire drawer surface (header, drag handle, body) is swipeable.
 */
export function useNestedDrawerSwipe(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const stateRef = useRef({ startY: 0, scrollContainer: null as HTMLElement | null, isPulling: false, translateY: 0 });
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Track the Paper DOM element via state so the effect re-runs when it mounts.
  // SwipeableDrawer calls paperRef(node) when the Paper mounts/unmounts.
  const [paperEl, setPaperEl] = useState<HTMLDivElement | null>(null);
  const paperRef = useCallback((node: HTMLDivElement | null) => {
    setPaperEl(node);
  }, []);

  useEffect(() => {
    if (!paperEl) return;

    const scheduleTimer = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timersRef.current.delete(id);
        fn();
      }, ms);
      timersRef.current.add(id);
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Walk up to find the nearest scroll container so we can check scrollTop
      let el: HTMLElement | null = e.target as HTMLElement;
      let scrollContainer: HTMLElement | null = null;
      while (el && el !== paperEl) {
        const style = window.getComputedStyle(el);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          scrollContainer = el;
          break;
        }
        el = el.parentElement;
      }

      stateRef.current = { startY: e.touches[0].clientY, scrollContainer, isPulling: false, translateY: 0 };
    };

    const handleTouchMove = (e: TouchEvent) => {
      const state = stateRef.current;
      if (!e.touches.length) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - state.startY;

      const atTop = !state.scrollContainer || state.scrollContainer.scrollTop <= 0;

      if (atTop && deltaY > 0) {
        if (!state.isPulling && deltaY > 10) {
          state.isPulling = true;
        }
        if (state.isPulling) {
          state.translateY = deltaY;
          paperEl.style.transform = `translateY(${deltaY}px)`;
          paperEl.style.transition = 'none';
        }
      } else if (state.isPulling) {
        state.isPulling = false;
        state.translateY = 0;
        paperEl.style.transform = '';
        paperEl.style.transition = '';
      }
    };

    const handleTouchEnd = () => {
      const state = stateRef.current;
      if (!state.isPulling) {
        if (state.translateY > 0) {
          paperEl.style.transform = '';
          paperEl.style.transition = '';
        }
        return;
      }

      const CLOSE_THRESHOLD = 80;

      if (state.translateY > CLOSE_THRESHOLD) {
        // Animate off-screen then close
        const targetY = paperEl.offsetHeight;
        paperEl.style.transition = 'transform 200ms cubic-bezier(0.0, 0, 0.2, 1)';
        paperEl.style.transform = `translateY(${targetY}px)`;
        scheduleTimer(() => {
          onCloseRef.current();
        }, 210);
      } else {
        // Snap back
        paperEl.style.transition = 'transform 200ms cubic-bezier(0.0, 0, 0.2, 1)';
        paperEl.style.transform = '';
        scheduleTimer(() => {
          paperEl.style.transition = '';
        }, 210);
      }

      state.isPulling = false;
      state.translateY = 0;
    };

    paperEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    paperEl.addEventListener('touchmove', handleTouchMove, { passive: true });
    paperEl.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      paperEl.removeEventListener('touchstart', handleTouchStart);
      paperEl.removeEventListener('touchmove', handleTouchMove);
      paperEl.removeEventListener('touchend', handleTouchEnd);
      // Clear any pending animation timers
      for (const id of timersRef.current) {
        clearTimeout(id);
      }
      timersRef.current.clear();
    };
  }, [paperEl]);

  return { paperRef };
}
