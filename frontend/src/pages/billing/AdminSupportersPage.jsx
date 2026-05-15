import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";

const FILTERS = ["pending", "approved", "rejected", "all"];

function statusClass(status) {
  if (status === "approved") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (status === "pending") return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  if (status === "rejected") return "border-red-400/30 bg-red-400/10 text-red-100";
  return "border-white/10 bg-white/10 text-slate-200";
}

function StatusBadge({ status }) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-black capitalize ${statusClass(status)}`}>{status || "unknown"}</span>;
}

function money(request) {
  return `${request.currency === "USD" ? "$" : "₹"}${Number(request.amount || 0).toLocaleString()}`;
}

function reference(request) {
  return request.utr || request.bankReference || request.providerReference || "—";
}

function errorMessage(err) {
  if (err.status === 401) return "Session expired. Please sign in again.";
  if (err.status === 403) return "You do not have permission to perform this action.";
  if (err.status === 404) return "Payment request not found.";
  return err.message || "Unable to update payment request.";
}

export default function AdminSupportersPage({ onBack }) {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (nextFilter = filter) => {
    setStatus("Loading payment requests...");
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextFilter !== "all") params.set("status", nextFilter);
      if (search.trim()) params.set("search", search.trim());
      const data = await apiClient(`/api/billing/admin/requests?${params.toString()}`);
      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setStatus("");
    } catch (err) {
      setStatus("");
      setError(errorMessage(err));
    }
  }, [filter, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(filter), 200);
    return () => window.clearTimeout(timer);
  }, [filter, search, load]);

  const counts = useMemo(() => ({
    pending: requests.filter((request) => request.status === "pending").length,
    approved: requests.filter((request) => request.status === "approved").length,
    rejected: requests.filter((request) => request.status === "rejected").length,
    all: requests.length,
  }), [requests]);

  const runAction = async (key, label, action) => {
    if (busyKey) return;
    setBusyKey(key);
    setToast("");
    setError("");
    try {
      await action();
      setToast(label);
      await load(filter);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyKey("");
    }
  };

  const approve = (request) => {
    if (!window.confirm(`Approve ${request.user?.email || "this user"}'s ${money(request)} payment request?`)) return;
    runAction(`approve-${request._id}`, "Payment request approved successfully.", () => apiClient(`/api/billing/admin/requests/${request._id}/approve`, { method: "PATCH" }));
  };

  const reject = (request) => {
    const reason = window.prompt("Reason for rejection", "Payment could not be verified");
    if (!reason || reason.trim().length < 6) {
      setError("Rejection reason is required.");
      return;
    }
    if (!window.confirm("Reject this payment request? The user will see the rejection reason.")) return;
    runAction(`reject-${request._id}`, "Payment request rejected successfully.", () => apiClient(`/api/billing/admin/requests/${request._id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason: reason.trim() }),
    }));
  };

  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-300">Admin billing</p>
          <h1 className="text-3xl font-black sm:text-4xl">Payment Requests</h1>
          <p className="mt-2 max-w-3xl text-slate-400">Review manual PayPal, UPI, and bank supporter requests. Approvals enable supporter badge and no-ads access.</p>
        </div>
        <button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold hover:bg-white/10">← Back</button>
      </div>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {FILTERS.map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-2xl border p-4 text-left transition ${filter === item ? "border-amber-300 bg-amber-300 text-black" : "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/10"}`}>
            <span className="text-sm font-bold uppercase tracking-wide">{item}</span>
            <span className="mt-2 block text-3xl font-black">{counts[item] ?? 0}</span>
          </button>
        ))}
      </section>

      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 md:flex-row md:items-center md:justify-between">
        <label className="flex-1 text-sm font-bold text-slate-300">
          Search by email, username, or reference ID
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-300" placeholder="example@email.com or UTR reference" />
        </label>
        <button type="button" onClick={() => load(filter)} className="rounded-xl bg-white/10 px-5 py-3 font-black hover:bg-white/15">Refresh</button>
      </div>

      {toast ? <p className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-100">{toast}</p> : null}
      {error ? <p className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-100">{error}</p> : null}
      {status ? <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">{status}</p> : null}

      <div className="hidden overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.04] lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request._id} className="border-t border-white/10">
                <td className="px-4 py-4"><b>{request.user?.username || "Unknown"}</b><p className="text-slate-400">{request.user?.email || "—"}</p></td>
                <td className="px-4 py-4 uppercase">{request.paymentMethod}</td>
                <td className="px-4 py-4 font-bold">{money(request)}</td>
                <td className="max-w-[260px] break-all px-4 py-4 font-mono">{reference(request)}</td>
                <td className="px-4 py-4"><StatusBadge status={request.status} /></td>
                <td className="px-4 py-4">{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-4">
                  {request.status === "pending" ? (
                    <div className="flex gap-2">
                      <button type="button" disabled={Boolean(busyKey)} onClick={() => approve(request)} className="rounded-lg bg-emerald-400 px-3 py-2 font-black text-black disabled:opacity-50">{busyKey === `approve-${request._id}` ? "Approving..." : "Approve"}</button>
                      <button type="button" disabled={Boolean(busyKey)} onClick={() => reject(request)} className="rounded-lg bg-red-400 px-3 py-2 font-black text-black disabled:opacity-50">{busyKey === `reject-${request._id}` ? "Rejecting..." : "Reject"}</button>
                    </div>
                  ) : <span className="text-slate-500">Reviewed</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:hidden">
        {requests.map((request) => (
          <article key={request._id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">{request.user?.username || "Unknown User"}</h2>
                <p className="text-sm text-slate-400">{request.user?.email || "—"}</p>
                <p className="mt-2 text-sm text-slate-300">Plan: <b>{request.plan?.replaceAll("_", " ")}</b> · Amount: <b>{money(request)}</b></p>
                <p className="break-all text-sm text-slate-300">Reference: <b className="font-mono">{reference(request)}</b></p>
                {request.rejectionReason ? <p className="mt-2 text-sm text-red-100">Reason: {request.rejectionReason}</p> : null}
              </div>
              <StatusBadge status={request.status} />
            </div>
            {request.status === "pending" ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" disabled={Boolean(busyKey)} onClick={() => approve(request)} className="rounded-xl bg-emerald-400 px-4 py-2 font-black text-black disabled:opacity-50">Approve</button>
                <button type="button" disabled={Boolean(busyKey)} onClick={() => reject(request)} className="rounded-xl bg-red-400 px-4 py-2 font-black text-black disabled:opacity-50">Reject</button>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {!status && requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">
          <p className="font-bold text-slate-100">No payment requests found.</p>
          <p className="mt-2 text-sm">Try another filter or search term.</p>
        </div>
      ) : null}
    </div>
  );
}
