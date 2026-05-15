import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";
import BillingStatus from "../../components/billing/BillingStatus";

const STATUS_STYLES = {
  approved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  pending: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  rejected: "border-red-400/30 bg-red-400/10 text-red-100",
  supporter: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  free: "border-slate-400/20 bg-white/10 text-slate-200",
};

function StatusBadge({ value }) {
  const safeValue = String(value || "free").toLowerCase();
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black capitalize ${STATUS_STYLES[safeValue] || STATUS_STYLES.free}`}>{safeValue.replaceAll("_", " ")}</span>;
}

function formatMoney(request) {
  const symbol = request?.currency === "USD" ? "$" : "₹";
  return `${symbol}${Number(request?.amount || 0).toLocaleString()}`;
}

function referenceFor(request) {
  return request?.utr || request?.bankReference || request?.providerReference || "—";
}

function BillingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {["Current plan", "Verification", "Ads", "Last request"].map((item) => (
        <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="mt-4 h-7 w-32 rounded bg-white/10" />
          <p className="mt-3 text-sm text-slate-500">Loading {item.toLowerCase()}...</p>
        </div>
      ))}
    </div>
  );
}

function PaymentRequestCard({ request }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-white">{request.plan?.replaceAll("_", " ") || "Supporter request"}</h3>
          <p className="text-sm text-slate-400">{request.paymentMethod?.toUpperCase()} · {formatMoney(request)}</p>
        </div>
        <StatusBadge value={request.status} />
      </div>
      <dl className="mt-4 grid gap-2 text-sm text-slate-300">
        <div><dt className="text-slate-500">Reference</dt><dd className="break-all font-mono">{referenceFor(request)}</dd></div>
        <div><dt className="text-slate-500">Submitted</dt><dd>{request.createdAt ? new Date(request.createdAt).toLocaleString() : "—"}</dd></div>
        {request.status === "rejected" ? <div><dt className="text-slate-500">Reason</dt><dd className="text-red-100">{request.rejectionReason || "Contact support for details."}</dd></div> : null}
      </dl>
    </article>
  );
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
        setBilling(data.billing || null);
        setRequests(Array.isArray(data.requests) ? data.requests : []);
      })
      .catch((err) => {
        if (err.status === 401) setError("Session expired. Please sign in again.");
        else setError(err.message || "Unable to load billing history. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const latestRequest = requests[0];
  const planLabel = useMemo(() => {
    if (billing?.isSupporter || billing?.isPremium) return "Supporter";
    if (requests.some((request) => request.status === "pending")) return "Pending verification";
    if (requests.some((request) => request.status === "rejected")) return "Rejected";
    return "Free";
  }, [billing, requests]);

  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-300">Billing</p>
          <h1 className="text-3xl font-black sm:text-4xl">Billing & Supporter Status</h1>
          <p className="mt-2 max-w-3xl text-slate-400">Track your supporter requests and manual PayPal, UPI, or bank payment verification status. ChessPlay gameplay remains free.</p>
        </div>
        <button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold hover:bg-white/10">← Back</button>
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-100">
          <p>{error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={loadBilling} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/15">Retry</button>
            {error.includes("sign in") ? <button type="button" onClick={() => onNavigate?.("login")} className="rounded-lg bg-amber-300 px-3 py-2 text-sm font-black text-black">Sign in</button> : null}
          </div>
        </div>
      ) : null}

      {loading ? <BillingSkeleton /> : (
        <div className="grid gap-4 md:grid-cols-4">
          <BillingStatus billing={billing} user={user} />
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-500">Verification</p>
            <div className="mt-3"><StatusBadge value={planLabel.toLowerCase()} /></div>
            <p className="mt-3 text-sm text-slate-400">Requests stay pending until an admin verifies your payment reference.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-500">Ads Status</p>
            <p className="mt-2 text-2xl font-black">{billing?.adsDisabled ? "No ads" : "Standard"}</p>
            <p className="mt-3 text-sm text-slate-400">Approved supporters get a no-ads experience where ads are enabled.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-500">Last Request</p>
            <p className="mt-2 text-2xl font-black capitalize">{latestRequest?.status || "None"}</p>
            <p className="mt-3 text-sm text-slate-400">{latestRequest ? `${latestRequest.paymentMethod?.toUpperCase()} · ${formatMoney(latestRequest)}` : "No billing requests yet."}</p>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => onNavigate?.("support")} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200">Support ChessPlay</button>
        {user?.isAdmin ? <button type="button" onClick={() => onNavigate?.("admin-supporters")} className="rounded-xl border border-white/10 px-5 py-3 font-bold hover:bg-white/10">Admin Payments</button> : null}
      </div>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Payment Requests</h2>
            <p className="text-sm text-slate-400">Manual verification history for PayPal, UPI, and bank transfers.</p>
          </div>
          <StatusBadge value="Manual Verification" />
        </div>

        {!loading && requests.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-center text-slate-400">
            <p className="font-bold text-slate-200">No billing requests yet.</p>
            <p className="mt-2 text-sm">Choose a supporter option, complete payment, and submit your reference ID for admin verification.</p>
            <button type="button" onClick={() => onNavigate?.("support")} className="mt-4 rounded-xl bg-amber-300 px-4 py-2 font-black text-black">View supporter options</button>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:hidden">
          {requests.map((request) => <PaymentRequestCard key={request._id} request={request} />)}
        </div>

        <div className="mt-5 hidden overflow-x-auto md:block">
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
              {requests.map((request) => (
                <tr key={request._id} className="border-t border-white/10">
                  <td className="py-3 pr-4 font-bold capitalize">{request.plan?.replaceAll("_", " ")}</td>
                  <td className="py-3 pr-4 uppercase">{request.paymentMethod}</td>
                  <td className="py-3 pr-4">{formatMoney(request)}</td>
                  <td className="max-w-[220px] break-all py-3 pr-4 font-mono">{referenceFor(request)}</td>
                  <td className="py-3 pr-4"><StatusBadge value={request.status} /></td>
                  <td className="py-3 pr-4 text-slate-400">{request.status === "rejected" ? request.rejectionReason || "Contact support for details." : "—"}</td>
                  <td className="py-3 pr-4">{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-black">How verification works</h2>
          <ol className="mt-4 grid gap-3 text-sm text-slate-300">
            <li><b>1.</b> Send your one-time supporter contribution using PayPal, UPI, or bank transfer.</li>
            <li><b>2.</b> Submit your transaction/reference ID from the Support page.</li>
            <li><b>3.</b> Admin verifies the payment and enables supporter badge plus no-ads access.</li>
          </ol>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-black">Billing FAQ</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-300">
            <p><b>Is ChessPlay free?</b> Yes. Core chess play remains free.</p>
            <p><b>Can I submit again?</b> Yes, after your pending request is reviewed.</p>
            <p><b>Why rejected?</b> The reference could not be verified. Check the reason and submit again with correct details.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
