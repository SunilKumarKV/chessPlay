import { useMemo } from "react";
import { normalizePlan } from "../config/plans";

export function useEntitlements(user) {
  return useMemo(() => {
    const plan = normalizePlan(user?.plan || user?.supporterPlan);
    const premium = Boolean(user?.isPremium || user?.isSupporter || plan !== "free");
    const entitlements = user?.entitlements || {};
    return {
      plan,
      isPremium: premium,
      hasFeature(feature) {
        if (premium && ["noAds", "premiumSounds", "premiumThemes", "advancedStats"].includes(feature)) return true;
        return Boolean(entitlements[feature]);
      },
    };
  }, [user]);
}
