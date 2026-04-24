'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { useOnboardingTour } from './onboarding-tour-provider';
import { getStepById, type TourStepDef } from './onboarding-tour-steps';
import styles from './onboarding-tour-overlay.module.css';

const ANCHOR_POLL_MS = 2000;

function findAnchor(selectors: string[] | null): HTMLElement | null {
  if (!selectors || selectors.length === 0) return null;
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

/**
 * Tracks an anchor element across DOM mutations and scroll/resize changes.
 * Returns null until the element exists; re-resolves when mutations happen.
 * `selectors` is expected to be a stable reference (the caller uses the array
 * attached to a step definition, which never changes identity for a given
 * step).
 */
function useAnchorElement(selectors: string[] | null, active: boolean): HTMLElement | null {
  const [el, setEl] = useState<HTMLElement | null>(null);

  // Keep the resolver in a ref so the effect below doesn't need to depend on
  // the selectors array identity (which is a prop, so React-stable but still
  // included in the dep list via this ref indirection without a lint disable).
  const selectorsRef = useRef(selectors);
  selectorsRef.current = selectors;

  useEffect(() => {
    if (!active) {
      setEl(null);
      return;
    }

    let cancelled = false;
    let pollId: number | null = null;

    const stopPolling = () => {
      if (pollId !== null) {
        window.clearInterval(pollId);
        pollId = null;
      }
    };

    const resolve = () => {
      if (cancelled) return;
      const current = selectorsRef.current;
      const found = current && current.length > 0 ? findAnchor(current) : null;
      setEl((prev) => (prev === found ? prev : found));
      // Once we've located the anchor, the fallback poll has done its job —
      // layout/mutation observers cover everything after that.
      if (found) stopPolling();
    };

    resolve();

    const observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });

    // Also re-check on scroll/resize for position refresh
    const onLayoutChange = () => resolve();
    window.addEventListener('scroll', onLayoutChange, true);
    window.addEventListener('resize', onLayoutChange);

    // Fallback poll for the first 2 seconds in case MutationObserver misses.
    // Cleared by resolve() as soon as the anchor is found.
    const start = Date.now();
    pollId = window.setInterval(() => {
      if (Date.now() - start > ANCHOR_POLL_MS) {
        stopPolling();
        return;
      }
      resolve();
    }, 100);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener('scroll', onLayoutChange, true);
      window.removeEventListener('resize', onLayoutChange);
      stopPolling();
    };
  }, [active]);

  // When the step (and therefore the selectors) change, reset the resolved
  // element so stale matches don't bleed into the new step's lookup.
  useEffect(() => {
    setEl(null);
  }, [selectors]);

  return el;
}

function useAnchorRect(anchor: HTMLElement | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!anchor) {
      setRect(null);
      return;
    }

    const update = () => {
      rafRef.current = requestAnimationFrame(() => {
        setRect(anchor.getBoundingClientRect());
      });
    };

    update();

    const onLayout = () => update();
    window.addEventListener('scroll', onLayout, true);
    window.addEventListener('resize', onLayout);
    const observer = new ResizeObserver(update);
    observer.observe(anchor);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onLayout, true);
      window.removeEventListener('resize', onLayout);
      observer.disconnect();
    };
  }, [anchor]);

  return rect;
}

type OverlayContentProps = {
  step: TourStepDef;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
};

function OverlayContent({ step, stepIndex, totalSteps, onNext, onSkip }: OverlayContentProps) {
  const isLast = stepIndex === totalSteps - 1;
  const buttonLabel = step.primaryLabel ?? (isLast ? 'Finish' : 'Next');
  const showPrimary = step.primaryLabel !== null;

  return (
    <>
      <div className={styles.title}>{step.title}</div>
      <div className={styles.body}>{step.body}</div>
      <div className={styles.footer}>
        <span className={styles.progress}>
          {stepIndex + 1} of {totalSteps}
        </span>
        <div className={styles.buttonRow}>
          <button type="button" className={styles.skipLink} onClick={onSkip}>
            Skip tour
          </button>
          {showPrimary && (
            <Button variant="contained" size="small" onClick={onNext}>
              {buttonLabel}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export default function OnboardingTourOverlay() {
  const { active, currentStepId, stepIndex, totalSteps, next, skip } = useOnboardingTour();
  const pathname = usePathname();

  const step = useMemo(() => (currentStepId ? (getStepById(currentStepId) ?? null) : null), [currentStepId]);

  const routeOk = step ? step.routeMatches(pathname) : false;
  const overlayActive = active && !!step && routeOk;

  const anchor = useAnchorElement(step?.anchorSelectors ?? null, overlayActive);
  const rect = useAnchorRect(anchor);

  // Scroll the anchor into view when it becomes available for the current step.
  useEffect(() => {
    if (!overlayActive || !anchor) return;
    anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [anchor, overlayActive, currentStepId]);

  if (!overlayActive || !step) return null;

  const placement = step.placement ?? 'bottom';

  // Anchor-backed overlay: Popper with mask cutout around the anchor.
  if (anchor && rect) {
    return (
      <>
        <Box
          className={styles.cutout}
          sx={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
        <Popper
          open
          anchorEl={anchor}
          placement={placement}
          sx={{ zIndex: 1301 }}
          modifiers={[
            { name: 'offset', options: { offset: [0, 14] } },
            { name: 'preventOverflow', options: { padding: 12 } },
            { name: 'flip', options: { fallbackPlacements: ['top', 'bottom'] } },
          ]}
        >
          <Paper className={styles.paper} elevation={8}>
            <OverlayContent step={step} stepIndex={stepIndex} totalSteps={totalSteps} onNext={next} onSkip={skip} />
          </Paper>
        </Popper>
      </>
    );
  }

  // The first step is a welcome dialog — centred with a dim scrim behind it.
  // Other non-anchored steps (or steps whose anchor hasn't mounted yet) render
  // as a top banner so they don't overlap the drawer they're narrating.
  const isIntro = step.id === 'home-intro';
  if (isIntro) {
    return (
      <>
        <div className={styles.introScrim} />
        <Paper className={styles.introPaper} elevation={8}>
          <OverlayContent step={step} stepIndex={stepIndex} totalSteps={totalSteps} onNext={next} onSkip={skip} />
        </Paper>
      </>
    );
  }

  return (
    <Paper className={styles.bannerPaper} elevation={8}>
      <OverlayContent step={step} stepIndex={stepIndex} totalSteps={totalSteps} onNext={next} onSkip={skip} />
    </Paper>
  );
}
