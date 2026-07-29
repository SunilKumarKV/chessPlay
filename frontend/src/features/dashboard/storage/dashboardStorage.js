export const ONBOARDING_STORAGE_KEYS = {
  completed: "chessplay_onboarding_completed",
  dismissed: "chessplay_onboarding_dismissed",
  started: "chessplay_onboarding_started",
  goal: "chessplay_goal",
  level: "chessplay_level",
};

export const WEAKNESS_STORAGE_KEYS = {
  dismissedId: "chessplay_weakness_dismissed_id",
  viewedId: "chessplay_weakness_viewed_id",
};

export const TRAINING_STORAGE_KEYS = {
  dismissedId: "chessplay_training_recommendation_dismissed_id",
  viewedId: "chessplay_training_recommendation_viewed_id",
};

export function safeGetLocalStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Dashboard personalization must never block the dashboard.
  }
}

export function safeGetSessionStorage(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetSessionStorage(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Session-only UI state must never block the dashboard.
  }
}
