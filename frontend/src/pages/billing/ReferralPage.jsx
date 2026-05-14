import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";

export default function ReferralPage({ onBack }) {
  const [data, setData] = useState(null);
  const [applyCode, setApplyCode] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const load = () => apiClient("/api/billing/referral/me").then(setData).catch((err) => setError(err.message || "Could not load referral"));
  useEffect(() => { load(); }, []);

  const copy = async () => {
    const code = data?.code || "";
    await navigator.clipboard?.writeText(`${window.location.origin}?ref=${code}`);
    setStatus("Referral link copied.");
  };

  const apply = async (event) => {
    event.preventDefault();
    setError(""); setStatus("Applying referral...");
    try {
      const result = await apiClient("/api/billing/referral/apply", { method: "POST", body: JSON.stringify({ code: applyCode }) });
      setStatus(result.message || "Referral applied.");
      setApplyCode("");
      load();
    } catch (err) {
      setStatus(""); setError(err.message || "Could not apply referral");
    }
  };

  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-300">Earn coins</p>
          <h1 className="text-3xl font-black sm:text-4xl">Referral Program</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Invite friend → friend joins → friend upgrades → reward coins.</p>
        </div>
        <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold text-slate-200 hover:bg-white/10">← Back</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400">Your code</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-4 font-mono text-2xl font-black text-amber-200">{data?.code || "Loading..."}</div>
            <button onClick={copy} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200">Copy invite link</button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-black/20 p-4"><div className="text-2xl font-black text-white">{data?.coins ?? 0}</div><div className="text-sm text-slate-400">Coins</div></div>
            <div className="rounded-2xl bg-black/20 p-4"><div className="text-2xl font-black text-white">25</div><div className="text-sm text-slate-400">Friend join reward</div></div>
            <div className="rounded-2xl bg-black/20 p-4"><div className="text-2xl font-black text-white">150+</div><div className="text-sm text-slate-400">Upgrade reward</div></div>
          </div>

          <h2 className="mt-7 text-xl font-black">Referral history</h2>
          <div className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10">
            {(data?.referrals || []).map((ref) => (
              <div key={ref._id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]">
                <div><div className="font-bold text-white">{ref.referred?.username || "Invite link"}</div><div className="text-xs text-slate-500">{ref.status} · {ref.rewardReason || "pending"}</div></div>
                <div className="font-black text-amber-300">+{ref.coinsEarned || 0} coins</div>
              </div>
            ))}
            {(!data?.referrals || data.referrals.length === 0) && <div className="p-5 text-sm text-slate-400">No referrals yet.</div>}
          </div>
        </section>

        <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-black">Apply a referral code</h2>
          <form onSubmit={apply} className="mt-4 space-y-3">
            <input value={applyCode} onChange={(e) => setApplyCode(e.target.value.toUpperCase())} placeholder="Enter code" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-white outline-none focus:border-amber-300" />
            <button className="w-full rounded-xl bg-[#81b64c] px-4 py-3 font-black text-black">Apply code</button>
          </form>
          {status && <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{status}</p>}
          {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
          <div className="mt-5 rounded-2xl bg-black/20 p-4 text-sm text-slate-300">Redeem coins for premium month, analysis credits, and board themes.</div>
        </aside>
      </div>
    </div>
  );
}
