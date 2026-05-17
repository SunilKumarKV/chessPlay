import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";

function labelFor(plan) {
  const value = String(plan || "free").toLowerCase();
  if (value === "lifetime") return "LIFETIME";
  if (value === "premium" || value === "supporter_yearly") return "PREMIUM";
  if (value === "pro" || value === "supporter_monthly") return "PRO";
  return "FREE";
}

export default function PlanBadge({ user, compact = false }) {
  const [remotePlan, setRemotePlan] = useState("");

  useEffect(() => {
    let active = true;
    if (!user || user.isGuest) {
      setRemotePlan("");
      return () => { active = false; };
    }
    apiClient("/api/me/entitlements")
      .then((data) => active && setRemotePlan(data.plan || "free"))
      .catch(() => active && setRemotePlan(""));
    return () => { active = false; };
  }, [user?.id, user?._id, user?.isGuest]);

  const plan = remotePlan || user?.plan || user?.supporterPlan || "free";
  const label = labelFor(plan);
  const isPremium = label !== "FREE" || Boolean(user?.isPremium || user?.isSupporter);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-black tracking-wide ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      } ${
        isPremium
          ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
          : "border-white/10 bg-white/5 text-slate-300"
      }`}
      title={`${labelFor(plan)} account`}
    >
      {isPremium ? "◆" : "♟"} {label}
    </span>
  );
}
