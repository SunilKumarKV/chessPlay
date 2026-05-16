const User = require("../models/User");
const { entitlementsForPlan, normalizePlan } = require("../config/plans");

async function getUserEntitlements(userId) {
  const user = await User.findById(userId).select("plan isPremium isSupporter entitlements planExpiresAt");
  if (!user) return { plan: "free", entitlements: {} };
  const expired = user.planExpiresAt && new Date(user.planExpiresAt).getTime() < Date.now();
  const plan = expired ? "free" : normalizePlan(user.plan);
  return {
    plan,
    entitlements: expired ? {} : entitlementsForPlan(plan, user.entitlements),
    isPremium: !expired && Boolean(user.isPremium || user.isSupporter || plan !== "free"),
  };
}

function requirePlan(allowedPlans = []) {
  const allowed = new Set(allowedPlans.map(normalizePlan));
  return async (req, res, next) => {
    try {
      const state = await getUserEntitlements(req.user?.userId);
      if (!allowed.has(state.plan)) {
        return res.status(402).json({ message: "Upgrade required for this feature.", plan: state.plan });
      }
      req.entitlements = state;
      return next();
    } catch {
      return res.status(500).json({ message: "Unable to verify plan access." });
    }
  };
}

function hasFeature(feature) {
  return async (req, res, next) => {
    try {
      const state = req.entitlements || await getUserEntitlements(req.user?.userId);
      if (!state.entitlements?.[feature]) {
        return res.status(402).json({ message: "Premium feature required.", feature });
      }
      req.entitlements = state;
      return next();
    } catch {
      return res.status(500).json({ message: "Unable to verify feature access." });
    }
  };
}

module.exports = {
  getUserEntitlements,
  hasFeature,
  requirePlan,
};
