import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import BillingStatus from "../../components/billing/BillingStatus";

export default function BillingPage({ user, onBack, onNavigate }) {
  const [billing, setBilling] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient("/api/billing/me")
      .then((data) => {
        setBilling(data.billing);
        setRequests(data.requests || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-300">SaaS Billing</p>
          <h1 className="text-3xl font-black sm:text-4xl">Subscription & Supporter Status</h1>
        </div>
        <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold hover:bg-white/10">← Back</button>
      </div>

      {error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{error}</p> : null}
      <BillingStatus billing={billing} user={user} />

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={() => onNavigate?.("pricing")} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200">Upgrade / Support</button>
        {user?.isAdmin && <button onClick={() => onNavigate?.("admin-supporters")} className="rounded-xl border border-white/10 px-5 py-3 font-bold hover:bg-white/10">Admin Requests</button>}
      </div>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-xl font-black">Recent Payment Requests</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">UTR</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan="5" className="py-6 text-slate-500">No supporter requests yet.</td></tr>
              ) : requests.map((request) => (
                <tr key={request._id} className="border-t border-white/10">
                  <td className="py-3 pr-4 font-bold">{request.plan}</td>
                  <td className="py-3 pr-4">₹{request.amount}</td>
                  <td className="py-3 pr-4 font-mono">{request.utr}</td>
                  <td className="py-3 pr-4"><span className="rounded-full bg-white/10 px-2 py-1 capitalize">{request.status}</span></td>
                  <td className="py-3 pr-4">{new Date(request.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
