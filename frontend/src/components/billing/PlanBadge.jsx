export default function PlanBadge({ user, compact = false }) {
  const plan = user?.plan || user?.supporterPlan || "free";
  const isPremium = Boolean(user?.isPremium || user?.isSupporter);
  const label = isPremium
    ? plan === "pro"
      ? "PRO"
      : "SUPPORTER"
    : "FREE";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-black tracking-wide ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      } ${
        isPremium
          ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
          : "border-white/10 bg-white/5 text-slate-300"
      }`}
      title={isPremium ? "Premium supporter account" : "Free account"}
    >
      {isPremium ? "👑" : "♟"} {label}
    </span>
  );
}
