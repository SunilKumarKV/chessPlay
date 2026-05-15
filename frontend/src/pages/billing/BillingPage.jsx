import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import BillingStatus from "../../components/billing/BillingStatus";

function statusClass(status) {
  if (status === "approved") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (status === "pending") return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  if (status === "rejected") return "border-red-400/30 bg-red-400/10 text-red-200";
  return "border-white/10 bg-white/10 text-slate-200";
}

export default function BillingPage({ user, onBack, onNavigate }) {
  const [billing, setBilling] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBilling = useCallback(() => {
    setLoading(true);
    setError("");
    apiClient("/api/billing/me")
      .then((data) => {
        setBilling(data.billing);
        setRequests(data.requests || []);
      })
      .catch((err) => setError(err.message || "Unable to load payment history."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-300">Supporter status</p>
          <h1 className="text-3xl font-black sm:text-4xl">Billing & Payment History</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Payment requests are manually verified. Approved requests enable supporter badge, no ads, and supporter benefits.</p>
        </div>
        <button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold hover:bg-white/10">← Back</button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
          <p>{error}</p>
          <button type="button" onClick={loadBilling} className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/15">Retry</button>
        </div>
      ) : null}
      {loading ? <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-slate-400">Loading billing status...</div> : <BillingStatus billing={billing} user={user} />}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => onNavigate?.("support")} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200">Support ChessPlay</button>
        {user?.isAdmin && <button type="button" onClick={() => onNavigate?.("admin-supporters")} className="rounded-xl border border-white/10 px-5 py-3 font-bold hover:bg-white/10">Admin Requests</button>}
      </div>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-xl font-black">Recent Payment Requests</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Reference</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="7" className="py-6 text-slate-500">Loading payment history...</td></tr> : null}
              {!loading && requests.length === 0 ? (
                <tr><td colSpan="7" className="py-6 text-slate-500">No payment requests yet.</td></tr>
              ) : requests.map((request) => (
                <tr key={request._id} className="border-t border-white/10">
                  <td className="py-3 pr-4 font-bold">{request.plan}</td>
                  <td className="py-3 pr-4 uppercase">{request.paymentMethod}</td>
                  <td className="py-3 pr-4">{request.currency === "USD" ? "$" : "₹"}{request.amount}</td>
                  <td className="py-3 pr-4 font-mono">{request.utr}</td>
                  <td className="py-3 pr-4"><span className={`rounded-full border px-2 py-1 text-xs font-bold capitalize ${statusClass(request.status)}`}>{request.status}</span></td>
                  <td className="py-3 pr-4 text-slate-400">{request.status === "rejected" ? request.rejectionReason || "Contact support for details." : "—"}</td>
                  <td className="py-3 pr-4">{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
