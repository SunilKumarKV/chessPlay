export const GUEST_ALLOWED_FEATURES = new Set(["ai", "local", "dashboard", "pricing", "support", "monetization", "help", "privacy", "terms"]);

export const GUEST_RESTRICTED_FEATURES = new Set([
  "multi",
  "lan",
  "history",
  "leaderboard",
  "profile",
  "settings",
  "billing",
  "community",
  "messages",
  "referral",
  "tournaments",
  "puzzles",
  "analysis",
  "admin",
  "admin-supporters",
  "automation",
]);

export const GUEST_FEATURE_MESSAGES = {
  multi: "Login to unlock real-time multiplayer rooms.",
  lan: "Login to unlock same-WiFi and room-based play.",
  history: "Login to save and view your game history.",
  leaderboard: "Login to join competitive leaderboard tracking.",
  profile: "Login to create your player profile and stats.",
  settings: "Login to save your ChessPlay settings.",
  billing: "Login to manage billing and supporter status.",
  community: "Login to access community features.",
  messages: "Login to use messages and chat features.",
  referral: "Login to use referral rewards.",
  tournaments: "Login to join tournaments.",
  puzzles: "Login to save puzzle progress.",
  analysis: "Login to unlock saved game analysis.",
  admin: "Admin area requires an authenticated admin account.",
  "admin-supporters": "Payment admin requires an authenticated admin account.",
  automation: "Automation requires an authenticated admin account.",
};

export function isGuestUser(user) {
  return Boolean(user?.isGuest);
}

export function isGuestAllowedFeature(feature) {
  return GUEST_ALLOWED_FEATURES.has(feature);
}

export function isGuestRestrictedFeature(feature) {
  return GUEST_RESTRICTED_FEATURES.has(feature);
}

export function getGuestFeatureMessage(feature) {
  return GUEST_FEATURE_MESSAGES[feature] || "Login to unlock this ChessPlay feature.";
}
