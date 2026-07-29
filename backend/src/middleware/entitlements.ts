// @ts-nocheck
import User from "../models/User";
import { entitlementsForPlan, getPlanLimits, normalizePlan } from "../config/plans";

async function syncExpiredPlan(user) {
  if (!user?.planExpiresAt || new Date(user.planExpiresAt).getTime() >= Date.now()) return false;
  user.plan = "free";
  user.planStatus = "expired";
  user.isPremium = false;
  user.isSupporter = false;
  user.supporterPlan = "none";
  user.adsDisabled = false;
  user.entitlements = {};
  await user.save().catch(() => {});
  return true;
}

async function getUserEntitlements(userId) {
  const user = await User.findById(userId).select("plan planStatus isPremium isSupporter entitlements planExpiresAt");
  if (!user) return { plan: "free", entitlements: {}, limits: getPlanLimits("free") };
  const expired = await syncExpiredPlan(user);
  const plan = expired ? "free" : normalizePlan(user.plan);
  return {
    plan,
    entitlements: expired ? {} : entitlementsForPlan(plan, user.entitlements),
    limits: getPlanLimits(plan),
    planStatus: user.planStatus || "active",
    planExpiresAt: user.planExpiresAt || null,
    isPremium: !expired && Boolean(user.isPremium || user.isSupporter || plan !== "free"),
  };
}

function getUserPlan(user) {
  if (!user) return "free";
  const expired = user.planExpiresAt && new Date(user.planExpiresAt).getTime() < Date.now();
  return expired ? "free" : normalizePlan(user.plan);
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

const requireFeature = hasFeature;

export { getPlanLimits,
  getUserPlan,
  getUserEntitlements,
  hasFeature,
  requireFeature,
  requirePlan,
  syncExpiredPlan, };
