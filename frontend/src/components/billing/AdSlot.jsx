export default function AdSlot({ user, label = "Support ChessPlay", placement = "dashboard_banner", onUpgrade }) {
  if (user?.adsDisabled || user?.isPremium || user?.isSupporter || user?.entitlements?.noAds) return null;

  return (
    <aside className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-4 text-center text-sm text-slate-300">
      <p className="mb-2 font-bold text-slate-100">{label}</p>
      <p className="mb-3 text-xs text-slate-400">
        Ad placement: {placement}. Free users may see ads after matches and on dashboards. Upgrade to remove ads and unlock premium features.
      </p>
      <button onClick={onUpgrade} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-black text-black hover:bg-amber-300">
        Upgrade ₹49/month
      </button>
    </aside>
  );
}
