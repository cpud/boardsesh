import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export type ConfettiVariant = 'ascent' | 'attempt';

/**
 * Returns a function that fires a subtle confetti burst.
 * Pass an HTMLElement to anchor the burst origin to that element,
 * otherwise it bursts from the bottom-center of the viewport.
 *
 * Variant controls the style:
 * - 'ascent' (default): multi-colour celebratory burst
 * - 'attempt': red-only, shorter range
 */
export function useConfetti() {
  const fireConfetti = useCallback((originElement?: HTMLElement | null, variant: ConfettiVariant = 'ascent') => {
    let x = 0.5;
    let y = 0.9;

    if (originElement) {
      const rect = originElement.getBoundingClientRect();
      x = (rect.left + rect.width / 2) / window.innerWidth;
      y = (rect.top + rect.height / 2) / window.innerHeight;
    }

    const isAttempt = variant === 'attempt';

    confetti({
      particleCount: 35,
      spread: isAttempt ? 40 : 60,
      startVelocity: isAttempt ? 12 : 25,
      decay: 0.92,
      scalar: 0.8,
      ticks: 60,
      origin: { x, y },
      gravity: 0.8,
      disableForReducedMotion: true,
      // Must be above MUI drawer z-index (1300) so confetti is visible
      // when fired from inside a SwipeableDrawer portal.
      zIndex: 1400,
      ...(isAttempt && { colors: ['#d32f2f', '#b71c1c', '#e53935'] }),
    });
  }, []);

  return fireConfetti;
}
