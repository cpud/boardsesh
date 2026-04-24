export const TOUR_OPEN_START_SESH_EVENT = 'onboarding:open-start-sesh';
export const TOUR_OPEN_DUMMY_SESH_EVENT = 'onboarding:open-dummy-sesh';
export const TOUR_CLOSE_DUMMY_SESH_EVENT = 'onboarding:close-dummy-sesh';
export const TOUR_OPEN_PLAY_QUEUE_EVENT = 'onboarding:open-play-queue';
export const TOUR_CLOSE_PLAY_QUEUE_EVENT = 'onboarding:close-play-queue';
export const TOUR_CLOSE_PLAY_VIEW_EVENT = 'onboarding:close-play-view';

// All dispatchTour* helpers guard on `typeof window` so they're safe to call
// from code that may execute during SSR. The tour provider itself is
// client-only, but having a consistent guard matches the wider project
// pattern (see `dispatchClimbListSwipeHintReplay`, `dispatchOpenPlayDrawer`).
const dispatch = (type: string): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type));
};

export const dispatchTourOpenStartSesh = (): void => dispatch(TOUR_OPEN_START_SESH_EVENT);
export const dispatchTourOpenDummySesh = (): void => dispatch(TOUR_OPEN_DUMMY_SESH_EVENT);
export const dispatchTourCloseDummySesh = (): void => dispatch(TOUR_CLOSE_DUMMY_SESH_EVENT);
export const dispatchTourOpenPlayQueue = (): void => dispatch(TOUR_OPEN_PLAY_QUEUE_EVENT);
export const dispatchTourClosePlayQueue = (): void => dispatch(TOUR_CLOSE_PLAY_QUEUE_EVENT);
export const dispatchTourClosePlayView = (): void => dispatch(TOUR_CLOSE_PLAY_VIEW_EVENT);
