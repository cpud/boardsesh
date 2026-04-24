export const TOUR_OPEN_START_SESH_EVENT = 'onboarding:open-start-sesh';
export const TOUR_OPEN_DUMMY_SESH_EVENT = 'onboarding:open-dummy-sesh';
export const TOUR_CLOSE_DUMMY_SESH_EVENT = 'onboarding:close-dummy-sesh';
export const TOUR_OPEN_PLAY_QUEUE_EVENT = 'onboarding:open-play-queue';
export const TOUR_CLOSE_PLAY_QUEUE_EVENT = 'onboarding:close-play-queue';
export const TOUR_CLOSE_PLAY_VIEW_EVENT = 'onboarding:close-play-view';

export const dispatchTourOpenStartSesh = () => {
  window.dispatchEvent(new CustomEvent(TOUR_OPEN_START_SESH_EVENT));
};

export const dispatchTourOpenDummySesh = () => {
  window.dispatchEvent(new CustomEvent(TOUR_OPEN_DUMMY_SESH_EVENT));
};

export const dispatchTourCloseDummySesh = () => {
  window.dispatchEvent(new CustomEvent(TOUR_CLOSE_DUMMY_SESH_EVENT));
};

export const dispatchTourOpenPlayQueue = () => {
  window.dispatchEvent(new CustomEvent(TOUR_OPEN_PLAY_QUEUE_EVENT));
};

export const dispatchTourClosePlayQueue = () => {
  window.dispatchEvent(new CustomEvent(TOUR_CLOSE_PLAY_QUEUE_EVENT));
};

export const dispatchTourClosePlayView = () => {
  window.dispatchEvent(new CustomEvent(TOUR_CLOSE_PLAY_VIEW_EVENT));
};
