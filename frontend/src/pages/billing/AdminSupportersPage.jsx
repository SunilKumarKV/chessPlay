import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";

export default function AdminSupportersPage({ onBack }) {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("Loading supporter requests...");
  const [filter, setFilter] = useState("pending");

  const load = useCallback(async (nextFilter = filter) => {
    setStatus("Loading supporter requests...");
    try {
      const data = await apiClient(`/api/billing/admin/requests?status=${encodeURIComponent(nextFilter)}`);
      setRequests(data.requests || []);
      setStatus("");
    } catch (err) {
      setStatus(err.message || "Could not load requests");
    }
  }, [filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load(filter);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [filter, load]);

  const approve = async (id) => {
    await apiClient(`/api/billing/admin/requests/${id}/approve`, { method: "PATCH" });
    await load();
  };

  const reject = async (id) => {
    const reason = window.prompt("Reason for rejection", "Payment could not be verified") || "Payment could not be verified";
    await apiClient(`/api/billing/admin/requests/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
    await load();
  };

  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-300">Admin</p>
          <h1 className="text-3xl font-black sm:text-4xl">Supporter Requests</h1>
          <p className="mt-2 text-slate-400">Manual UPI verification. Never approve without checking UTR/payment proof.</p>
        </div>
        <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold hover:bg-white/10">← Back</button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {["pending", "approved", "rejected"].map((item) => (
          <button key={item} onClick={() => { setFilter(item); load(item); }} className={`rounded-xl px-4 py-2 font-bold capitalize ${filter === item ? "bg-amber-300 text-black" : "border border-white/10 text-slate-200 hover:bg-white/10"}`}>{item}</button>
        ))}
      </div>

      {status && <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">{status}</p>}

      <div className="grid gap-4">
        {requests.map((request) => (
          <article key={request._id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">{request.user?.username || "Unknown User"}</h2>
                <p className="text-sm text-slate-400">{request.user?.email}</p>
                <p className="mt-2 text-sm text-slate-300">Plan: <b>{request.plan}</b> · Amount: <b>₹{request.amount}</b></p>
                <p className="text-sm text-slate-300">UPI: <b>{request.upiId}</b> · UTR: <b className="font-mono">{request.utr}</b></p>
                {request.paymentProofUrl && <a className="mt-2 inline-block text-sm font-bold text-amber-300 underline" href={request.paymentProofUrl} target="_blank" rel="noreferrer">Open proof</a>}
                {request.note && <p className="mt-2 text-sm text-slate-400">Note: {request.note}</p>}
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold capitalize">{request.status}</span>
            </div>
            {request.status === "pending" && (
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => approve(request._id)} className="rounded-xl bg-emerald-400 px-4 py-2 font-black text-black hover:bg-emerald-300">Approve</button>
                <button onClick={() => reject(request._id)} className="rounded-xl bg-red-400 px-4 py-2 font-black text-black hover:bg-red-300">Reject</button>
              </div>
            )}
          </article>
        ))}
        {!status && requests.length === 0 && <p className="rounded-xl border border-white/10 bg-white/[0.04] p-5 text-slate-400">No {filter} requests.</p>}
      </div>
    </div>
  );
}
