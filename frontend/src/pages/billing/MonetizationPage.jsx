import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import AdSlot from "../../components/billing/AdSlot";

const FALLBACK_UNLOCKS = [
  ["noAds", "No ads"],
  ["premiumSounds", "Premium sounds"],
  ["unlimitedAnalysis", "Unlimited analysis"],
  ["advancedEngineDepth", "Advanced engine depth"],
  ["customBoards", "Custom boards"],
  ["premiumThemes", "Premium themes"],
  ["advancedStats", "Advanced stats"],
  ["unlimitedGameReview", "Unlimited game review"],
  ["tournaments", "Tournaments"],
  ["earlyAccess", "Early access"],
];

export default function MonetizationPage({ user, onBack, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient("/api/billing/monetization")
      .then(setData)
      .catch((err) => setError(err.message || "Could not load monetization status"));
  }, []);

  const billing = data?.billing || {};
  const adsEnabled = data?.ads?.enabled ?? !(user?.isPremium || user?.adsDisabled || user?.isSupporter);

  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-300">Premium features</p>
          <h1 className="text-3xl font-black sm:text-4xl">Premium Unlocks & Ads</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Free users see ads. Premium users get no ads, deeper analysis, custom themes and tournament access.</p>
        </div>
        <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold text-slate-200 hover:bg-white/10">← Back</button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Current plan: {billing.plan || user?.plan || "free"}</h2>
              <p className="mt-1 text-sm text-slate-400">Ads: {adsEnabled ? "enabled for free plan" : "disabled for premium"}</p>
            </div>
            <button onClick={() => onNavigate?.("pricing")} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200">Upgrade plan</button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {FALLBACK_UNLOCKS.map(([key, label]) => {
              const unlocked = Boolean(billing.entitlements?.[key]) || Boolean(user?.entitlements?.[key]);
              return (
                <div key={key} className={`rounded-2xl border p-4 ${unlocked ? "border-emerald-300/30 bg-emerald-300/10" : "border-white/10 bg-black/20"}`}>
                  <div className="text-2xl">{unlocked ? "✅" : "🔒"}</div>
                  <h3 className="mt-2 font-black text-white">{label}</h3>
                  <p className="mt-1 text-xs text-slate-400">{unlocked ? "Available in your account" : "Unlock with premium/supporter plan"}</p>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-black">Ad placements</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>✅ After match ad card</li>
              <li>✅ Dashboard banner</li>
              <li>✅ Home page promo slot</li>
              <li>✅ Rewarded ad slot after opt-in activities</li>
            </ul>
          </div>
          <AdSlot user={adsEnabled ? {} : { isPremium: true }} label="Dashboard banner ad preview" />
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-300">
            <h2 className="text-xl font-black text-white">Networks</h2>
            <p className="mt-2">Web: Google AdSense / Media.net</p>
            <p className="mt-1">Mobile later: AdMob / Unity Ads</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
