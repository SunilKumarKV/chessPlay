const PLANS = {
  free: {
    id: "free",
    label: "Free",
    amountInr: 0,
    amountUsd: 0,
    durationDays: 0,
    puzzleLimit: 5,
    features: ["play_ai", "multiplayer", "basic_puzzles", "leaderboard"],
    entitlements: {},
  },
  pro: {
    id: "pro",
    label: "Pro",
    amountInr: 99,
    amountUsd: 3,
    durationDays: 30,
    puzzleLimit: 25,
    features: ["no_ads", "premium_sounds", "pro_puzzles", "basic_analysis"],
    entitlements: { noAds: true, premiumSounds: true, premiumThemes: true, earlyAccess: true, premiumPuzzleFilters: true },
  },
  premium: {
    id: "premium",
    label: "Premium",
    amountInr: 299,
    amountUsd: 8,
    durationDays: 30,
    puzzleLimit: 100,
    features: ["no_ads", "premium_sounds", "premium_puzzles", "advanced_analysis", "coach_placeholder"],
    entitlements: {
      noAds: true,
      premiumSounds: true,
      unlimitedAnalysis: true,
      advancedEngineDepth: true,
      customBoards: true,
      premiumThemes: true,
      advancedStats: true,
      unlimitedGameReview: true,
      earlyAccess: true,
      premiumPuzzleFilters: true,
      advancedAnalysis: true,
    },
  },
  lifetime: {
    id: "lifetime",
    label: "Lifetime",
    amountInr: 2999,
    amountUsd: 79,
    durationDays: 36500,
    puzzleLimit: 200,
    features: ["all_premium", "lifetime_badge", "priority_feedback"],
    entitlements: {
      noAds: true,
      premiumSounds: true,
      unlimitedAnalysis: true,
      advancedEngineDepth: true,
      customBoards: true,
      premiumThemes: true,
      advancedStats: true,
      unlimitedGameReview: true,
      tournaments: true,
      earlyAccess: true,
      premiumPuzzleFilters: true,
      advancedAnalysis: true,
    },
  },
};

const LEGACY_PLAN_ALIASES = {
  supporter_monthly: "pro",
  supporter_yearly: "premium",
};

function normalizePlan(plan) {
  const value = String(plan || "free");
  return PLANS[value] ? value : LEGACY_PLAN_ALIASES[value] || "free";
}

function planConfig(plan) {
  return PLANS[normalizePlan(plan)] || PLANS.free;
}

function getPlanLimits(plan) {
  const config = planConfig(plan);
  return {
    puzzleLimit: config.puzzleLimit,
    durationDays: config.durationDays,
    amountInr: config.amountInr,
    amountUsd: config.amountUsd,
  };
}

function entitlementsForPlan(plan, userEntitlements = {}) {
  return { ...planConfig(plan).entitlements, ...(userEntitlements || {}) };
}

module.exports = {
  LEGACY_PLAN_ALIASES,
  PLANS,
  entitlementsForPlan,
  getPlanLimits,
  normalizePlan,
  planConfig,
};
