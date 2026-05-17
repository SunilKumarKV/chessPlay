export const PLANS = {
  free: {
    id: "free",
    label: "Free",
    priceInr: 0,
    priceUsd: 0,
    copy: "Core chess remains free.",
    features: ["Play vs AI", "Multiplayer", "Beginner puzzles", "Leaderboard"],
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceInr: 99,
    priceUsd: 3,
    copy: "For regular training and cleaner gameplay.",
    features: ["25 puzzles/day", "No ads", "Premium sounds", "Early features"],
  },
  premium: {
    id: "premium",
    label: "Premium",
    priceInr: 299,
    priceUsd: 8,
    copy: "For serious improvement and deeper practice.",
    features: ["100 puzzles/day", "Advanced puzzle filters", "Advanced analysis placeholders", "Priority feedback"],
  },
  lifetime: {
    id: "lifetime",
    label: "Lifetime",
    priceInr: 2999,
    priceUsd: 79,
    copy: "One-time supporter access for long-term users.",
    features: ["200 puzzles/day", "Lifetime badge", "All premium placeholders", "Priority roadmap voting"],
  },
};

export function normalizePlan(plan) {
  if (PLANS[plan]) return plan;
  if (plan === "supporter_monthly") return "pro";
  if (plan === "supporter_yearly") return "premium";
  return "free";
}
