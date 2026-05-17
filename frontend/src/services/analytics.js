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
