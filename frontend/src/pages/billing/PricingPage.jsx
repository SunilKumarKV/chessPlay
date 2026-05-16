import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";
import WaitlistForm from "../../components/waitlist/WaitlistForm";
import { trackEvent } from "../../services/analytics";

const FALLBACK_PLANS = {
  free: {
    label: "Free",
    amount: 0,
    usdAmount: 0,
    days: 0,
    benefits: ["Play vs AI", "Play Online", "Play vs Player", "Puzzles", "Basic analysis", "Game history"],
  },
  pro: {
    label: "Pro",
    amount: 99,
    usdAmount: 3,
    days: 30,
    benefits: ["25 puzzles/day", "No ads", "Premium sounds", "Early feature access"],
  },
  premium: {
    label: "Premium",
    amount: 299,
    usdAmount: 8,
    days: 30,
    benefits: ["100 puzzles/day", "Advanced filters", "Analysis placeholders", "Priority feedback"],
  },
  lifetime: {
    label: "Lifetime",
    amount: 2999,
    usdAmount: 79,
    days: 36500,
    benefits: ["200 puzzles/day", "Lifetime badge", "All premium placeholders", "Roadmap voting"],
  },
  supporter_monthly: {
    label: "Supporter Monthly",
    amount: 49,
    usdAmount: 2,
    days: 30,
    benefits: ["Supporter badge", "No ads", "Early feature access", "Priority feedback", "Custom themes later", "Support development"],
  },
  supporter_yearly: {
    label: "Supporter Yearly",
    amount: 499,
    usdAmount: 12,
    days: 365,
    benefits: ["Supporter badge", "No ads", "Early feature access", "Priority feedback", "Custom themes later", "Support development"],
  },
};

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", currency: "INR" },
  { id: "paypal", label: "PayPal", currency: "USD" },
  { id: "bank", label: "Bank transfer", currency: "INR" },
];

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "devwithsunilyt@gmail.com";
const FALLBACK_PAYPAL = import.meta.env.VITE_SUPPORT_PAYPAL_EMAIL || "";
const FALLBACK_UPI = import.meta.env.VITE_SUPPORT_UPI_ID || "";
const FALLBACK_BANK = import.meta.env.VITE_SUPPORT_BANK_LABEL || "";

function normalizePlans(plans) {
  return {
    free: FALLBACK_PLANS.free,
    pro: plans?.pro || FALLBACK_PLANS.pro,
    premium: plans?.premium || FALLBACK_PLANS.premium,
    lifetime: plans?.lifetime || FALLBACK_PLANS.lifetime,
    supporter_monthly: plans?.supporter_monthly || FALLBACK_PLANS.supporter_monthly,
    supporter_yearly: plans?.supporter_yearly || FALLBACK_PLANS.supporter_yearly,
  };
}

function statusLabel(billing, requests) {
  if (billing?.isSupporter || billing?.isPremium) return "Supporter";
  const latest = requests?.[0];
  if (latest?.status === "pending") return "Pending verification";
  if (latest?.status === "rejected") return "Rejected";
  return "Free";
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("supporter") || value.includes("approved")) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (value.includes("pending")) return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  if (value.includes("rejected")) return "border-red-400/30 bg-red-400/10 text-red-200";
  return "border-white/10 bg-white/10 text-slate-200";
}

function methodAmount(method, plan) {
  if (method === "paypal") return plan?.usdAmount || FALLBACK_PLANS.supporter_monthly.usdAmount;
  return plan?.amount || FALLBACK_PLANS.supporter_monthly.amount;
}

export default function PricingPage({ user, onBack, onNavigate }) {
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [methods, setMethods] = useState(null);
  const [billing, setBilling] = useState(null);
  const [requests, setRequests] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("supporter_monthly");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [form, setForm] = useState({ amount: "", reference: "", paymentDate: new Date().toISOString().slice(0, 10), note: "", payerEmail: "" });
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingPlans(true);
    apiClient("/api/billing/plans", { skipAuthRefresh: true })
      .then((data) => {
        if (!active) return;
        setPlans(normalizePlans(data.plans));
        setMethods(data.paymentMethods || null);
      })
      .catch(() => {
        if (active) setPlans(FALLBACK_PLANS);
      })
      .finally(() => active && setLoadingPlans(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!user || user.isGuest) {
      setBilling(null);
      setRequests([]);
      return () => {
        active = false;
      };
    }
    setLoadingBilling(true);
    apiClient("/api/billing/me")
      .then((data) => {
        if (!active) return;
        setBilling(data.billing || null);
        setRequests(data.requests || []);
      })
      .catch((err) => active && setError(err.message || "Unable to load payment status."))
      .finally(() => active && setLoadingBilling(false));
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const plan = plans[selectedPlan] || FALLBACK_PLANS.supporter_monthly;
    setForm((current) => ({ ...current, amount: String(methodAmount(paymentMethod, plan)) }));
  }, [paymentMethod, plans, selectedPlan]);

  const selected = plans[selectedPlan] || FALLBACK_PLANS.supporter_monthly;
  const allMethods = useMemo(() => {
    const configured = [...(methods?.india || []), ...(methods?.global || [])];
    return PAYMENT_METHODS.map((method) => {
      const match = configured.find((item) => item.id === method.id);
      return { ...method, ...(match || {}) };
    });
  }, [methods]);
  const selectedMethod = allMethods.find((method) => method.id === paymentMethod) || allMethods[0];
  const upiId = selectedMethod?.upiId || methods?.india?.find((method) => method.id === "upi")?.upiId || FALLBACK_UPI;
  const paypalEmail = selectedMethod?.paypalEmail || methods?.global?.find((method) => method.id === "paypal")?.paypalEmail || FALLBACK_PAYPAL;
  const bankDetails = selectedMethod?.bank || methods?.india?.find((method) => method.id === "bank")?.bank || null;
  const bankText = bankDetails?.accountName ? `${bankDetails.accountName} · ${bankDetails.bankName} · ${bankDetails.accountNumber} · ${bankDetails.ifsc}` : FALLBACK_BANK;
  const currentStatus = statusLabel(billing, requests);
  const canSubmit = Boolean(user && !user.isGuest && !submitting);

  const copyText = async (label, value) => {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    setCopied(`${label} copied.`);
    window.setTimeout(() => setCopied(""), 2200);
  };

  const validateForm = () => {
    const amount = Number(form.amount);
    const minimum = methodAmount(paymentMethod, selected);
    if (!Number.isFinite(amount) || amount < minimum) return `Minimum amount for this plan is ${paymentMethod === "paypal" ? "$" : "₹"}${minimum}.`;
    if (!String(form.reference).trim() || String(form.reference).trim().length < 6) return "Enter a valid transaction/reference ID with at least 6 characters.";
    if (!PAYMENT_METHODS.some((method) => method.id === paymentMethod)) return "Choose a valid payment method.";
    if (paymentMethod === "paypal" && form.payerEmail && !/^\S+@\S+\.\S+$/.test(form.payerEmail)) return "Enter a valid PayPal payer email or leave it blank.";
    return "";
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!user || user.isGuest) {
      setError("Sign in to submit a supporter request.");
      return;
    }
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        plan: selectedPlan,
        amount: Number(form.amount),
        paymentMethod,
        utr: form.reference.trim(),
        upiId: paymentMethod === "upi" ? "payer@manual" : "",
        bankReference: paymentMethod === "bank" ? form.reference.trim() : "",
        providerReference: paymentMethod === "paypal" ? form.reference.trim() : "",
        payerEmail: form.payerEmail.trim(),
        paymentDate: form.paymentDate,
        note: form.note.trim(),
      };
      const data = await apiClient("/api/billing/upi-request", { method: "POST", body: JSON.stringify(body) });
      setSuccess(data.message || "Payment request submitted for verification.");
      setRequests((items) => [data.request, ...items]);
      setForm({ amount: String(methodAmount(paymentMethod, selected)), reference: "", paymentDate: new Date().toISOString().slice(0, 10), note: "", payerEmail: "" });
    } catch (err) {
      setError(err.message || "Unable to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const faqs = [
    ["Is ChessPlay still free?", "Yes. Core chess play remains free, including AI, online rooms, local player mode, puzzles, and basic analysis."],
    ["How is supporter verified?", "You send payment by PayPal, UPI, or bank transfer, then submit the reference ID. Admin verifies it manually."],
    ["How long approval takes?", "Manual approval depends on admin availability. Your request status will show as pending until reviewed."],
    ["Can I request support?", `Yes. Contact ${SUPPORT_EMAIL} for payment or account questions.`],
    ["What benefits are included?", "Supporters get a badge, no ads, early feature access, priority feedback, and future cosmetic themes."],
  ];

  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-300">Support / Pricing</p>
          <h1 className="text-3xl font-black sm:text-4xl">Support ChessPlay</h1>
          <p className="mt-2 max-w-3xl text-slate-400">Help keep ChessPlay free while supporting hosting, future features, and development. Payments are manually verified by admin.</p>
        </div>
        <button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold text-slate-200 hover:bg-white/10">← Back</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {loadingPlans ? <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-slate-400 lg:col-span-3">Loading pricing details...</div> : null}
        {!loadingPlans && Object.entries(plans).map(([key, plan]) => {
          const isFree = key === "free";
          const active = selectedPlan === key;
          return (
            <article key={key} className={`rounded-3xl border p-5 ${active && !isFree ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-white/[0.04]"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">{plan.label}</h2>
                  <p className="mt-1 text-sm text-slate-400">{isFree ? "Always available" : `${plan.days} days supporter access`}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-black text-amber-200">{isFree ? "₹0" : `₹${plan.amount}`}</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-slate-300">
                {(plan.benefits || []).map((benefit) => <li key={benefit}>✓ {benefit}</li>)}
              </ul>
              {!isFree && (
                <button type="button" onClick={() => { trackEvent("premium_click", { plan: key }); setSelectedPlan(key); }} className="mt-5 w-full rounded-xl bg-amber-300 px-4 py-3 font-black text-black hover:bg-amber-200">Choose {plan.label}</button>
              )}
            </article>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Payment options</h2>
              <p className="mt-1 text-sm text-slate-400">Send payment first, then submit the reference ID for verification.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(currentStatus)}`}>{loadingBilling ? "Loading status" : currentStatus}</span>
          </div>

          <ol className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <li className="rounded-2xl border border-white/10 bg-black/20 p-3"><b>1.</b> Send payment</li>
            <li className="rounded-2xl border border-white/10 bg-black/20 p-3"><b>2.</b> Copy reference ID</li>
            <li className="rounded-2xl border border-white/10 bg-black/20 p-3"><b>3.</b> Submit request</li>
          </ol>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {allMethods.map((method) => (
              <button key={method.id} type="button" onClick={() => setPaymentMethod(method.id)} className={`rounded-2xl border p-4 text-left transition ${paymentMethod === method.id ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-black/20 hover:bg-white/10"}`}>
                <div className="font-black text-white">{method.label}</div>
                <div className="mt-1 text-sm text-slate-400">{method.id === "paypal" ? `$${methodAmount("paypal", selected)}` : `₹${methodAmount(method.id, selected)}`}</div>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-amber-300/30 bg-black/20 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Selected payment detail</p>
            {paymentMethod === "upi" && (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="break-all font-mono text-amber-200">{upiId || "Payment details are being updated. Please contact support."}</span>
                <button type="button" disabled={!upiId} onClick={() => copyText("UPI ID", upiId)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15 disabled:opacity-50">Copy UPI</button>
              </div>
            )}
            {paymentMethod === "paypal" && (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="break-all font-mono text-amber-200">{paypalEmail || "Payment details are being updated. Please contact support."}</span>
                <button type="button" disabled={!paypalEmail} onClick={() => copyText("PayPal email", paypalEmail)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15 disabled:opacity-50">Copy PayPal</button>
              </div>
            )}
            {paymentMethod === "bank" && (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="break-words text-sm text-amber-100">{bankText || "Payment details are being updated. Please contact support."}</span>
                <button type="button" disabled={!bankText} onClick={() => copyText("Bank details", bankText)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15 disabled:opacity-50">Copy Bank</button>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">Do not share passwords, OTPs, card details, or private banking credentials. Only submit the payment reference ID.</p>
          </div>
          {copied && <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{copied}</p>}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-black">Submit supporter request</h2>
          {!user || user.isGuest ? (
            <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">
              <p className="font-bold">Sign in to submit a supporter request.</p>
              <p className="mt-1 text-sm">You can still view plans and payment options while logged out.</p>
            </div>
          ) : null}
          <form onSubmit={submitRequest} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-300">Payment method
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300">
                {PAYMENT_METHODS.map((method) => <option key={method.id} value={method.id}>{method.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-slate-300">Amount
              <input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} inputMode="decimal" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" />
            </label>
            <label className="text-sm font-bold text-slate-300 sm:col-span-2">Transaction / reference ID
              <input required value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="Enter UTR, bank reference, or PayPal transaction ID" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" />
            </label>
            <label className="text-sm font-bold text-slate-300">Payment date
              <input type="date" value={form.paymentDate} onChange={(event) => setForm({ ...form, paymentDate: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" />
            </label>
            {paymentMethod === "paypal" && (
              <label className="text-sm font-bold text-slate-300">PayPal payer email optional
                <input value={form.payerEmail} onChange={(event) => setForm({ ...form, payerEmail: event.target.value })} placeholder="payer@email.com" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" />
              </label>
            )}
            <label className="text-sm font-bold text-slate-300 sm:col-span-2">Optional note
              <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value.slice(0, 500) })} rows={3} maxLength={500} placeholder="Add any helpful payment details for admin verification." className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" />
            </label>
            {error && <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200 sm:col-span-2">{error}</p>}
            {success && <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200 sm:col-span-2">{success}</p>}
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button type="submit" disabled={!canSubmit} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Submitting request..." : "Submit for verification"}</button>
              <button type="button" onClick={() => onNavigate?.("billing")} className="rounded-xl border border-white/10 px-5 py-3 font-bold text-slate-200 hover:bg-white/10">View payment history</button>
            </div>
          </form>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Your payment history</h2>
            <p className="mt-1 text-sm text-slate-400">Approved requests enable supporter badge, no ads, and supporter features. Rejected requests include a reason when admin adds one.</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(currentStatus)}`}>{currentStatus}</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400"><tr><th className="py-2 pr-4">Plan</th><th className="py-2 pr-4">Method</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Reference</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Note</th></tr></thead>
            <tbody>
              {loadingBilling ? <tr><td colSpan="6" className="py-6 text-slate-500">Loading payment history...</td></tr> : null}
              {!loadingBilling && requests.length === 0 ? <tr><td colSpan="6" className="py-6 text-slate-500">No payment requests yet.</td></tr> : null}
              {requests.map((request) => (
                <tr key={request._id || request.utr} className="border-t border-white/10">
                  <td className="py-3 pr-4 font-bold">{request.plan}</td>
                  <td className="py-3 pr-4 uppercase">{request.paymentMethod}</td>
                  <td className="py-3 pr-4">{request.currency === "USD" ? "$" : "₹"}{request.amount}</td>
                  <td className="py-3 pr-4 font-mono">{request.utr}</td>
                  <td className="py-3 pr-4"><span className={`rounded-full border px-2 py-1 text-xs font-bold capitalize ${statusClass(request.status)}`}>{request.status}</span></td>
                  <td className="py-3 pr-4 text-slate-400">{request.status === "rejected" ? request.rejectionReason || "Please contact support for details." : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-black">Supporter roadmap</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["No ads", "Themes", "Advanced analysis", "Puzzle packs", "Early feature access", "Priority feedback"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">{item}</div>)}
          </div>
          <p className="mt-4 text-sm text-slate-500">No fake supporter counts, fake revenue, or fake limited offers are shown. Benefits are enabled after manual admin approval.</p>
        </section>
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-black">FAQ</h2>
          <div className="mt-4 space-y-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <summary className="cursor-pointer font-bold text-white">{question}</summary>
                <p className="mt-2 text-sm text-slate-400">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-xl font-black">Premium waitlist</h2>
        <p className="mt-1 text-sm text-slate-400">Get updates for trials, Razorpay checkout, AI Coach, and deeper analysis features.</p>
        <WaitlistForm source="pricing" interest="premium" />
      </section>
    </div>
  );
}
