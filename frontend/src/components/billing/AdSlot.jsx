export default function AdSlot({ user, label = "Support ChessPlay" }) {
  if (user?.adsDisabled || user?.isPremium || user?.isSupporter) return null;

  return (
    <aside className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-4 text-center text-sm text-slate-300">
      <p className="mb-2 font-bold text-slate-100">{label}</p>
      <p className="mb-3 text-xs text-slate-400">
        Free users may see supporter/ad cards. Upgrade to hide ads and get a premium badge.
      </p>
      <button className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-black text-black">
        Upgrade ₹49/month
      </button>
    </aside>
  );
}
