const KNOWN_EVENTS = new Set([
  "signup",
  "login",
  "play_ai",
  "multiplayer_start",
  "puzzle_start",
  "premium_click",
  "checkout_start",
  "payment_success",
  "feedback_submit",
  "onboarding_started",
  "goal_selected",
  "level_selected",
  "first_ai_game_started",
  "first_puzzle_started",
  "onboarding_dismissed",
  "onboarding_completed",
  "weakness_viewed",
  "weakness_cta_clicked",
  "weakness_dismissed",
  "training_recommendation_viewed",
  "training_recommendation_clicked",
  "training_recommendation_dismissed",
]);

export function trackEvent(name, properties = {}) {
  if (!KNOWN_EVENTS.has(name)) return;
  const provider = import.meta.env.VITE_ANALYTICS_PROVIDER || "console";
  const key = import.meta.env.VITE_ANALYTICS_KEY || "";
  if (!key && provider !== "console") return;
  if (provider === "console" && import.meta.env.DEV) {
    console.debug("[analytics]", name, properties);
  }
  window.dispatchEvent(new CustomEvent("chessplay:analytics", { detail: { name, properties } }));
}
