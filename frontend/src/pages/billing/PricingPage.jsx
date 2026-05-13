import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";

const DEFAULT_PLANS = {
  supporter_monthly: {
    label: "Supporter Monthly",
    amount: 49,
    days: 30,
    benefits: ["No ads", "Premium badge", "Early beta access"],
  },
  supporter_yearly: {
    label: "Supporter Yearly",
    amount: 499,
    days: 365,
    benefits: ["No ads", "Premium badge", "Best value", "Early beta access"],
  },
  pro: {
    label: "Future Pro",
    amount: 999,
    days: 365,
    benefits: ["No ads", "Pro badge", "Future tournaments", "Advanced analysis"],
  },
};

function upiLink({ upiId, merchantName, amount, label }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: merchantName,
    am: String(amount),
    cu: "INR",
    tn: `ChessPlay ${label}`,
  });
  return `upi://pay?${params.toString()}`;
}

export default function PricingPage({ onBack, onNavigate }) {
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [upiId, setUpiId] = useState("your-upi-id@bank");
  const [merchantName, setMerchantName] = useState("ChessPlay");
  const [selectedPlan, setSelectedPlan] = useState(() => sessionStorage.getItem("chessplay_selected_plan") || "supporter_monthly");
  const [form, setForm] = useState({ upiId: "", utr: "", paymentProofUrl: "", note: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient("/api/billing/plans")
      .then((data) => {
        setPlans(data.plans || DEFAULT_PLANS);
        setUpiId(data.upiId || "your-upi-id@bank");
        setMerchantName(data.merchantName || "ChessPlay");
      })
      .catch(() => {
        setStatus("Using local pricing until backend billing config is deployed.");
      });
  }, []);

  const selected = plans[selectedPlan] || DEFAULT_PLANS.supporter_monthly;
  const paymentLink = useMemo(
    () => upiLink({ upiId, merchantName, amount: selected.amount, label: selected.label }),
    [upiId, merchantName, selected],
  );

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("Submitting supporter request...");
    try {
      await apiClient("/api/billing/upi-request", {
        method: "POST",
        body: JSON.stringify({
          plan: selectedPlan,
          amount: selected.amount,
          upiId: form.upiId,
          utr: form.utr,
          paymentProofUrl: form.paymentProofUrl,
          note: form.note,
        }),
      });
      setStatus("Request submitted. Admin will verify your UPI payment and enable your badge/no-ads plan.");
      setForm({ upiId: "", utr: "", paymentProofUrl: "", note: "" });
    } catch (err) {
      setStatus("");
      setError(err.message || "Could not submit request");
    }
  };

  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-300">ChessPlay v1.2.1</p>
          <h1 className="text-3xl font-black sm:text-4xl">Supporter Plans</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Free hosting friendly monetization: manual UPI approval, premium badge, no-ads supporter access, and future SaaS-ready billing.
          </p>
        </div>
        <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold text-slate-200 hover:bg-white/10">
          ← Back
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(plans).map(([key, plan]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedPlan(key)}
            className={`rounded-3xl border p-5 text-left transition ${selectedPlan === key ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">{plan.label}</h2>
                <p className="mt-1 text-sm text-slate-400">{plan.days} days access</p>
              </div>
              <p className="text-2xl font-black text-amber-300">₹{plan.amount}</p>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-slate-300">
              {(plan.benefits || []).map((benefit) => <li key={benefit}>✅ {benefit}</li>)}
            </ul>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-black">Pay with UPI</h2>
          <p className="mt-2 text-sm text-slate-400">Plan: {selected.label} · Amount: ₹{selected.amount}</p>
          <div className="mt-4 rounded-2xl border border-dashed border-amber-300/30 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">UPI ID</p>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white/5 p-3">
              <span className="break-all font-mono text-amber-200">{upiId}</span>
              <button onClick={() => navigator.clipboard?.writeText(upiId)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15">Copy</button>
            </div>
            <a href={paymentLink} className="mt-4 block rounded-xl bg-amber-300 px-4 py-3 text-center font-black text-black hover:bg-amber-200">
              Open UPI App
            </a>
            <p className="mt-3 text-xs text-slate-500">After payment, submit your UPI ID and UTR/reference number. Access is enabled only after admin verification.</p>
          </div>
        </section>

        <form onSubmit={submitRequest} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-black">Submit Payment Proof</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-300">
              Your UPI ID
              <input required value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} placeholder="name@bank" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" />
            </label>
            <label className="text-sm font-bold text-slate-300">
              UTR / Reference No.
              <input required value={form.utr} onChange={(e) => setForm({ ...form, utr: e.target.value })} placeholder="UPI reference number" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" />
            </label>
            <label className="text-sm font-bold text-slate-300 sm:col-span-2">
              Payment Screenshot URL optional
              <input value={form.paymentProofUrl} onChange={(e) => setForm({ ...form, paymentProofUrl: e.target.value })} placeholder="https://..." className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" />
            </label>
            <label className="text-sm font-bold text-slate-300 sm:col-span-2">
              Note optional
              <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" />
            </label>
          </div>
          {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
          {status && <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{status}</p>}
          <button className="mt-5 rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200">Submit for Approval</button>
          <button type="button" onClick={() => onNavigate?.("billing")} className="ml-3 rounded-xl border border-white/10 px-5 py-3 font-bold text-slate-200 hover:bg-white/10">View Billing</button>
        </form>
      </div>
    </div>
  );
}
