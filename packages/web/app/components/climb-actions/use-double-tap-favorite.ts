'use client';

import { useState, useCallback, type RefCallback } from 'react';
import { useDoubleTap } from '@/app/lib/hooks/use-double-tap';
import { useFavorite } from './use-favorite';

interface UseDoubleTapFavoriteOptions {
  climbUuid: string;
}

interface UseDoubleTapFavoriteReturn {
  doubleTapRef: RefCallback<HTMLElement>;
  onDoubleClick: () => void;
  showHeart: boolean;
  dismissHeart: () => void;
  isFavorited: boolean;
  toggleFavorite: () => Promise<boolean>;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
}

/**
 * Composes useDoubleTap + useFavorite to provide double-tap-to-like
 * with heart animation state. Instagram-style: double-tap only adds
 * a like, never removes it.
 */
export function useDoubleTapFavorite({ climbUuid }: UseDoubleTapFavoriteOptions): UseDoubleTapFavoriteReturn {
  const { isFavorited, toggleFavorite, isAuthenticated } = useFavorite({ climbUuid });
  const [showHeart, setShowHeart] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleDoubleTap = useCallback(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    // Always show heart animation
    setShowHeart(true);

    // Only toggle if not already favorited (Instagram behavior)
    if (!isFavorited) {
      toggleFavorite();
    }
  }, [isAuthenticated, isFavorited, toggleFavorite]);

  const { ref: doubleTapRef, onDoubleClick } = useDoubleTap(handleDoubleTap);

  const dismissHeart = useCallback(() => {
    setShowHeart(false);
  }, []);

  return {
    doubleTapRef,
    onDoubleClick,
    showHeart,
    dismissHeart,
    isFavorited,
    toggleFavorite,
    showAuthModal,
    setShowAuthModal,
  };
}
