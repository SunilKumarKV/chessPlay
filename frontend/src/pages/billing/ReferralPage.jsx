import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";

const SHARE_PLATFORMS = [
  { label: "WhatsApp", build: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
  { label: "Telegram", build: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { label: "X", build: (url, text) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { label: "LinkedIn", build: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
];

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("reward")) return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  if (value.includes("verified") || value.includes("joined")) return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  if (value.includes("reject")) return "border-red-300/30 bg-red-300/10 text-red-100";
  return "border-white/10 bg-white/10 text-slate-200";
}

function StatCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-300">{label}</div>
      {helper && <div className="mt-2 text-xs leading-relaxed text-slate-500">{helper}</div>}
    </div>
  );
}

export default function ReferralPage({ onBack, onNavigate }) {
  const [data, setData] = useState(null);
  const [applyCode, setApplyCode] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const inviteLink = useMemo(() => {
    if (!data?.code) return "";
    return `${window.location.origin}/register?ref=${data.code}`;
  }, [data?.code]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiClient("/api/billing/referral/me");
      setData(result);
    } catch (err) {
      setError(err.status === 401 ? "Please sign in to view referrals." : err.message || "Could not load referrals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const copy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard?.writeText(inviteLink);
    setStatus("Referral link copied.");
    setError("");
  };

  const apply = async (event) => {
    event.preventDefault();
    if (applying) return;
    setError("");
    setStatus("");
    setApplying(true);
    try {
      const result = await apiClient("/api/billing/referral/apply", {
        method: "POST",
        body: JSON.stringify({ code: applyCode }),
      });
      setStatus(result.message || "Referral connected successfully.");
      setApplyCode("");
      await load();
    } catch (err) {
      setError(err.message || "Could not apply referral code.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          {[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />)}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
        <div className="rounded-3xl border border-red-300/20 bg-red-300/10 p-6 text-red-100">
          <h1 className="text-2xl font-black">Unable to load referrals</h1>
          <p className="mt-2 text-sm">{error}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={load} className="rounded-xl bg-white px-4 py-2 font-black text-black">Retry</button>
            <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold text-white">Back</button>
          </div>
        </div>
      </div>
    );
  }

  const shareText = "Join me on ChessPlay and play chess online.";
  const stats = data?.stats || {};
  const referrals = data?.referrals || [];

  return (
    <main className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8" aria-labelledby="referral-title">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-300">Invite & grow</p>
          <h1 id="referral-title" className="text-3xl font-black sm:text-4xl">Invite Friends</h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Invite friends to ChessPlay and help grow the community. Referral rewards are supporter perks and early-access benefits that are reviewed manually.
          </p>
        </div>
        <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold text-slate-200 hover:bg-white/10">← Back</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Your referral code</p>
                <div className="mt-2 inline-flex rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-4 font-mono text-2xl font-black text-emerald-200">
                  {data?.code || "Unavailable"}
                </div>
              </div>
              {data?.user?.isSupporter && <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-sm font-black text-amber-100">Supporter</span>}
            </div>

            <label className="mt-5 block text-sm font-bold text-slate-300" htmlFor="referral-link">Referral link</label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input id="referral-link" readOnly value={inviteLink} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              <button onClick={copy} disabled={!inviteLink} className="rounded-xl bg-[#81b64c] px-5 py-3 font-black text-black hover:bg-[#9bd56a] disabled:cursor-not-allowed disabled:opacity-60">Copy link</button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SHARE_PLATFORMS.map((platform) => (
                <a
                  key={platform.label}
                  href={inviteLink ? platform.build(inviteLink, shareText) : "#"}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Share referral link on ${platform.label}`}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                >
                  {platform.label}
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Invites tracked" value={stats.invitesSent ?? 0} helper="Real tracked registrations only." />
            <StatCard label="Joined users" value={stats.joinedUsers ?? 0} />
            <StatCard label="Verified referrals" value={stats.verifiedReferrals ?? 0} helper="Manual verification ready." />
            <StatCard label="Reward status" value={stats.rewardStatus || "Manual review"} />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-black">Referral history</h2>
            <p className="mt-1 text-sm text-slate-400">Only real referrals connected through your invite link appear here.</p>
            <div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 overflow-hidden">
              {referrals.map((ref) => (
                <div key={ref.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <div className="font-bold text-white">{ref.username}</div>
                    <div className="text-xs text-slate-500">Joined {ref.joinedAt ? new Date(ref.joinedAt).toLocaleDateString() : "recently"}</div>
                    <div className="mt-1 text-xs text-slate-400">{ref.rewardNote}</div>
                  </div>
                  <span className={`h-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${statusClass(ref.status)}`}>{ref.status}</span>
                </div>
              ))}
              {referrals.length === 0 && <div className="p-5 text-sm text-slate-400">No referrals yet. Share your link to invite your first friend.</div>}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-black">How it works</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-300">
              <li>1. Share your referral link.</li>
              <li>2. Your friend signs up with the link.</li>
              <li>3. Referral appears in your dashboard.</li>
              <li>4. Rewards are reviewed manually.</li>
            </ol>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-black">Apply a referral code</h2>
            <form onSubmit={apply} className="mt-4 space-y-3">
              <label className="sr-only" htmlFor="apply-referral-code">Referral code</label>
              <input id="apply-referral-code" value={applyCode} onChange={(e) => setApplyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="Enter code" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-white outline-none focus:border-emerald-300" />
              <button disabled={applying || !applyCode} className="w-full rounded-xl bg-[#81b64c] px-4 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-60">{applying ? "Connecting..." : "Connect referral"}</button>
            </form>
            {status && <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{status}</p>}
            {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
          </section>

          <section className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
            <h2 className="text-xl font-black text-amber-100">Supporter rewards roadmap</h2>
            <div className="mt-4 space-y-3">
              {(data?.rewards || []).map((reward) => (
                <div key={reward.threshold} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="font-black text-white">{reward.threshold} verified referrals</div>
                  <div className="text-sm text-slate-300">{reward.label}</div>
                  <div className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-200">{reward.status}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-amber-100/80">No cash payouts are active yet. Referral rewards are manually reviewed supporter perks.</p>
            <button onClick={() => onNavigate?.("monetization")} className="mt-4 w-full rounded-xl bg-amber-300 px-4 py-3 font-black text-black hover:bg-amber-200">Visit Premium</button>
          </section>
        </aside>
      </div>
    </main>
  );
}
