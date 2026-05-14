import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";

const DEFAULT_PLANS = {
  supporter_monthly: {
    label: "Supporter Monthly",
    amount: 49,
    usdAmount: 2,
    days: 30,
    benefits: ["No ads", "Premium sounds", "Premium badge", "Advanced analysis credits"],
  },
  supporter_yearly: {
    label: "Supporter Yearly",
    amount: 499,
    usdAmount: 12,
    days: 365,
    benefits: ["No ads", "Premium sounds", "Custom boards", "Best value", "Early beta access"],
  },
  pro: {
    label: "Pro",
    amount: 999,
    usdAmount: 24,
    days: 365,
    benefits: ["No ads", "Unlimited analysis", "Advanced engine depth", "Tournaments", "Advanced stats"],
  },
};

function upiLink({ upiId, merchantName, amount, label }) {
  const params = new URLSearchParams({ pa: upiId, pn: merchantName, am: String(amount), cu: "INR", tn: `ChessPlay ${label}` });
  return `upi://pay?${params.toString()}`;
}

export default function PricingPage({ onBack, onNavigate }) {
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [methods, setMethods] = useState(null);
  const [upiId, setUpiId] = useState("");
  const [merchantName, setMerchantName] = useState("ChessPlay");
  const [selectedPlan, setSelectedPlan] = useState(() => sessionStorage.getItem("chessplay_selected_plan") || "supporter_monthly");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [intent, setIntent] = useState(null);
  const [form, setForm] = useState({ upiId: "", utr: "", paymentProofUrl: "", note: "", payerEmail: "", bankReference: "", providerReference: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient("/api/billing/plans")
      .then((data) => {
        setPlans(data.plans || DEFAULT_PLANS);
        setUpiId(data.upiId || "");
        setMerchantName(data.merchantName || "ChessPlay");
        setMethods(data.paymentMethods || null);
      })
      .catch(() => setStatus("Pricing is available, but live payment details are temporarily unavailable. Please try again later."));
  }, []);

  useEffect(() => {
    apiClient(`/api/billing/payment-methods?plan=${encodeURIComponent(selectedPlan)}`)
      .then((data) => setMethods(data.methods || null))
      .catch(() => {});
  }, [selectedPlan]);

  const selected = plans[selectedPlan] || DEFAULT_PLANS.supporter_monthly;
  const paymentLink = useMemo(() => upiLink({ upiId, merchantName, amount: selected.amount, label: selected.label }), [upiId, merchantName, selected]);
  const availableMethods = [...(methods?.india || []), ...(methods?.global || [])].filter((method) => method.configured !== false);
  const selectedMethod = availableMethods.find((m) => m.id === paymentMethod) || availableMethods[0];
  const activePaymentMethod = selectedMethod?.id || paymentMethod;
  const displayAmount = activePaymentMethod === "paypal" || activePaymentMethod === "stripe" ? `$${selected.usdAmount || 2}` : `₹${selected.amount}`;

  const createIntent = async () => {
    setError("");
    setStatus("Creating secure payment intent...");
    try {
      const data = await apiClient("/api/billing/payment-intents", { method: "POST", body: JSON.stringify({ plan: selectedPlan, provider: activePaymentMethod }) });
      setIntent(data.intent);
      setStatus("Payment intent created. Complete payment and submit proof below.");
      if (data.intent?.providerCheckoutUrl) window.open(data.intent.providerCheckoutUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setStatus("");
      setError(err.message || "Could not create payment intent");
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("Submitting secure payment proof...");
    try {
      await apiClient("/api/billing/upi-request", {
        method: "POST",
        body: JSON.stringify({
          plan: selectedPlan,
          amount: activePaymentMethod === "paypal" || activePaymentMethod === "stripe" ? (selected.usdAmount || 2) : selected.amount,
          paymentMethod: activePaymentMethod,
          upiId: form.upiId,
          utr: form.utr || form.bankReference || form.providerReference,
          bankReference: form.bankReference,
          payerEmail: form.payerEmail,
          providerReference: form.providerReference,
          paymentIntentReference: intent?.reference || "",
          paymentProofUrl: form.paymentProofUrl,
          note: form.note,
        }),
      });
      setStatus("Payment proof submitted. Admin verification will enable your premium/no-ads plan.");
      setForm({ upiId: "", utr: "", paymentProofUrl: "", note: "", payerEmail: "", bankReference: "", providerReference: "" });
    } catch (err) {
      setStatus("");
      setError(err.message || "Could not submit request");
    }
  };

  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-300">ChessPlay v1.3.0-alpha.3</p>
          <h1 className="text-3xl font-black sm:text-4xl">Pricing & Secure Payments</h1>
          <p className="mt-2 max-w-2xl text-slate-400">UPI, bank transfer, QR scan, PayPal, Stripe links and manual approval fallback with signed payment proof.</p>
        </div>
        <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold text-slate-200 hover:bg-white/10">← Back</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(plans).map(([key, plan]) => (
          <button key={key} type="button" onClick={() => { setSelectedPlan(key); sessionStorage.setItem("chessplay_selected_plan", key); }} className={`rounded-3xl border p-5 text-left transition ${selectedPlan === key ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-black text-white">{plan.label}</h2><p className="mt-1 text-sm text-slate-400">{plan.days} days access</p></div>
              <p className="text-2xl font-black text-amber-300">₹{plan.amount}</p>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-slate-300">{(plan.benefits || []).map((benefit) => <li key={benefit}>✅ {benefit}</li>)}</ul>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-black">Choose payment method</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {availableMethods.length === 0 && (
              <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100 sm:col-span-2">
                Secure payment setup is being activated. Please contact support from the Help page for manual supporter activation.
              </div>
            )}
            {availableMethods.map((method) => (
              <button key={method.id} type="button" onClick={() => setPaymentMethod(method.id)} className={`rounded-2xl border p-4 text-left ${paymentMethod === method.id ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-black/20 hover:bg-white/10"}`}>
                <div className="font-black text-white">{method.label}</div>
                <div className="mt-1 text-sm text-slate-400">{method.currency} {method.amount}</div>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-amber-300/30 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected method</p>
            <h3 className="mt-2 text-lg font-black text-white">{selectedMethod?.label || paymentMethod} · {displayAmount}</h3>

            {(activePaymentMethod === "upi" || activePaymentMethod === "qr") && upiId && (
              <>
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/5 p-3"><span className="break-all font-mono text-amber-200">{upiId}</span><button onClick={() => navigator.clipboard?.writeText(upiId)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15">Copy</button></div>
                {selectedMethod?.qrUrl && <img src={selectedMethod.qrUrl} alt="ChessPlay payment QR" className="mt-4 max-h-52 rounded-xl border border-white/10 bg-white p-2" />}
                <a href={paymentLink} className="mt-4 block rounded-xl bg-amber-300 px-4 py-3 text-center font-black text-black hover:bg-amber-200">Open UPI App</a>
              </>
            )}

            {activePaymentMethod === "bank" && <div className="mt-3 space-y-2 rounded-xl bg-white/5 p-3 text-sm text-slate-300"><p>Account: {selectedMethod?.bank?.accountName}</p><p>No: {selectedMethod?.bank?.accountNumber}</p><p>IFSC: {selectedMethod?.bank?.ifsc}</p><p>Bank: {selectedMethod?.bank?.bankName}</p></div>}
            {(activePaymentMethod === "paypal" || activePaymentMethod === "stripe") && <button onClick={createIntent} className="mt-4 w-full rounded-xl bg-[#81b64c] px-4 py-3 font-black text-black">Create intent / open checkout</button>}
            {intent && <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs text-slate-300">Intent: <span className="font-mono text-amber-200">{intent.reference}</span></p>}
            <p className="mt-3 text-xs text-slate-500">Live PayPal/Stripe webhooks require provider secrets in Render. Manual approval remains safe fallback.</p>
          </div>
        </section>

        <form onSubmit={submitRequest} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-black">Submit Payment Proof</h2>
          <p className="mt-2 text-sm text-slate-400">All submitted references are duplicate-protected and signed on the backend before admin approval.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(activePaymentMethod === "upi" || activePaymentMethod === "qr") && <label className="text-sm font-bold text-slate-300">Your UPI ID<input required value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} placeholder="name@bank" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" /></label>}
            <label className="text-sm font-bold text-slate-300">UTR / Bank / Provider Ref<input required value={form.utr} onChange={(e) => setForm({ ...form, utr: e.target.value })} placeholder="reference number" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" /></label>
            {(activePaymentMethod === "paypal" || activePaymentMethod === "stripe") && <label className="text-sm font-bold text-slate-300">Payment email<input value={form.payerEmail} onChange={(e) => setForm({ ...form, payerEmail: e.target.value })} placeholder="payer@email.com" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" /></label>}
            <label className="text-sm font-bold text-slate-300 sm:col-span-2">Payment Screenshot URL optional<input value={form.paymentProofUrl} onChange={(e) => setForm({ ...form, paymentProofUrl: e.target.value })} placeholder="https://..." className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" /></label>
            <label className="text-sm font-bold text-slate-300 sm:col-span-2">Note optional<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" /></label>
          </div>
          {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
          {status && <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{status}</p>}
          <button disabled={!selectedMethod} className="mt-5 rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">Submit for Approval</button>
          <button type="button" onClick={() => onNavigate?.("billing")} className="ml-3 rounded-xl border border-white/10 px-5 py-3 font-bold text-slate-200 hover:bg-white/10">View Billing</button>
        </form>
      </div>
    </div>
  );
}
