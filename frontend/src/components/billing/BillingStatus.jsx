import PlanBadge from "./PlanBadge";

export default function BillingStatus({ billing, user }) {
  const source = billing || user || {};
  const expires = source.planExpiresAt || source.supporterExpiresAt;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-white">Current Plan</h3>
        <PlanBadge user={source} />
      </div>
      <dl className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd className="font-bold capitalize text-slate-100">{source.planStatus || "active"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Ads</dt>
          <dd className="font-bold text-slate-100">{source.adsDisabled ? "Hidden" : "Enabled"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Expires</dt>
          <dd className="font-bold text-slate-100">{expires ? new Date(expires).toLocaleDateString() : "No expiry"}</dd>
        </div>
      </dl>
    </div>
  );
}
