import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";
import SupporterBadge from "../../components/billing/SupporterBadge";

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "devwithsunilyt@gmail.com";
const PAYPAL_EMAIL = import.meta.env.VITE_SUPPORT_PAYPAL_EMAIL || import.meta.env.VITE_PAYPAL_EMAIL || "";
const UPI_ID = import.meta.env.VITE_SUPPORT_UPI_ID || import.meta.env.VITE_UPI_ID || "";
const BANK_LABEL = import.meta.env.VITE_SUPPORT_BANK_LABEL || "Bank details are shared by support after request verification.";

const FREE_FEATURES = [
  "Play vs AI",
  "Online rooms",
  "Local player mode",
  "Starter puzzles",
  "Basic analysis",
  "Game history",
];

const SUPPORTER_FEATURES = [
  { label: "Supporter badge", status: "Available now" },
  { label: "No promotional ads where ads are enabled", status: "Available now" },
  { label: "Priority feature feedback", status: "Available now" },
  { label: "Early access to UI/theme experiments", status: "Supporter preview" },
  { label: "Future board themes", status: "Coming soon" },
  { label: "Advanced analysis reports", status: "Coming soon" },
];

const ROADMAP = [
  "No ads and supporter badge",
  "Board themes and cosmetic profile highlights",
  "Advanced analysis reports",
  "Extra puzzle packs and training paths",
  "Supporter feature voting",
];

function badgeClass(value) {
  const label = String(value || "").toLowerCase();
  if (label.includes("supporter") || label.includes("approved") || label.includes("available")) return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  if (label.includes("pending") || label.includes("preview")) return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  if (label.includes("rejected")) return "border-red-300/30 bg-red-300/10 text-red-100";
  return "border-white/10 bg-white/[0.06] text-slate-200";
}

function StatusBadge({ children }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${badgeClass(children)}`}>{children}</span>;
}

function latestRequestStatus(requests) {
  const latest = requests?.[0];
  if (!latest) return { label: "Free", message: "No supporter requests yet." };
  if (latest.status === "pending") return { label: "Pending verification", message: "Your latest supporter request is waiting for admin verification." };
  if (latest.status === "rejected") return { label: "Rejected", message: latest.rejectionReason || "Your latest request needs correction before approval." };
  if (latest.status === "approved") return { label: "Supporter", message: "Thank you for supporting ChessPlay." };
  return { label: "Free", message: "Core chess features remain free." };
}

function copyToClipboard(value, setToast) {
  if (!value) {
    setToast("Payment detail is not configured yet. Please contact support.");
    return;
  }
  navigator.clipboard?.writeText(value)
    .then(() => setToast("Copied to clipboard."))
    .catch(() => setToast("Unable to copy. Please copy it manually."));
}

function PaymentCard({ title, value, helper, onCopy }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-white">{title}</h3>
          <p className="mt-1 break-all text-sm text-slate-300">{value || "Payment details are being updated."}</p>
        </div>
        <StatusBadge>Manual Verification</StatusBadge>
      </div>
      <p className="mt-3 text-xs text-slate-500">{helper}</p>
      <button
        type="button"
        onClick={onCopy}
        className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-white/10"
      >
        Copy details
      </button>
    </article>
  );
}

function PremiumSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {["Plan", "Verification", "Benefits"].map((item) => (
        <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="mt-4 h-8 w-36 rounded bg-white/10" />
          <p className="mt-3 text-sm text-slate-500">Loading {item.toLowerCase()}...</p>
        </div>
      ))}
    </div>
  );
}

export default function MonetizationPage({ user, onBack, onNavigate }) {
  const [plans, setPlans] = useState(null);
  const [billing, setBilling] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const isLoggedIn = Boolean(user && !user.isGuest);

  const loadPremium = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const planData = await apiClient("/api/billing/plans", { skipAuthRefresh: true });
      setPlans(planData);
      if (isLoggedIn) {
        try {
          const billingData = await apiClient("/api/billing/me");
          setBilling(billingData.billing || null);
          setRequests(Array.isArray(billingData.requests) ? billingData.requests : []);
        } catch (err) {
          if (err.status === 401) setError("Please sign in to manage supporter access.");
          else setError(err.message || "Unable to load supporter status.");
        }
      } else {
        setBilling(null);
        setRequests([]);
      }
    } catch (err) {
      setError(err.message || "Unable to load premium details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadPremium();
  }, [loadPremium]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const status = useMemo(() => {
    if (billing?.isSupporter || billing?.isPremium || user?.isSupporter || user?.isPremium) {
      return { label: "Supporter", message: "Thank you for supporting ChessPlay. Your supporter badge and no-ads access are active." };
    }
    return latestRequestStatus(requests);
  }, [billing, requests, user]);

  const adsDisabled = Boolean(billing?.adsDisabled || user?.adsDisabled || user?.isSupporter || user?.isPremium);
  const supporterPlan = plans?.plans?.supporter_monthly;
  const oneTimeAmount = supporterPlan?.amount || 49;
  const oneTimeUsd = supporterPlan?.usdAmount || 2;

  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-300">Supporter plan</p>
          <h1 className="text-3xl font-black sm:text-4xl">ChessPlay Premium</h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Support ChessPlay development and unlock cosmetic/supporter benefits. Core chess gameplay stays free for everyone.
          </p>
        </div>
        <button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold hover:bg-white/10">← Back</button>
      </div>

      {toast ? <div className="mb-4 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100">{toast}</div> : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-red-100">
          <p>{error}</p>
          <button type="button" onClick={loadPremium} className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/15">Retry</button>
        </div>
      ) : null}

      {loading ? <PremiumSkeleton /> : (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/15 via-white/[0.05] to-transparent p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <StatusBadge>{status.label}</StatusBadge>
                  <h2 className="mt-4 text-2xl font-black sm:text-3xl">{status.label === "Supporter" ? "You are a ChessPlay Supporter" : "Become a ChessPlay Supporter"}</h2>
                  <p className="mt-3 max-w-2xl text-slate-300">{status.message}</p>
                </div>
                {status.label === "Supporter" ? <SupporterBadge user={{ isSupporter: true }} /> : null}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-slate-500">Current plan</p>
                  <p className="mt-2 text-2xl font-black">{status.label}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-slate-500">Ads status</p>
                  <p className="mt-2 text-2xl font-black">{adsDisabled ? "No ads" : "Standard"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-slate-500">Contribution</p>
                  <p className="mt-2 text-2xl font-black">₹{oneTimeAmount} / ${oneTimeUsd}</p>
                  <p className="mt-1 text-xs text-slate-500">One-time manual verification</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {isLoggedIn ? (
                  <>
                    <button type="button" onClick={() => onNavigate?.("support")} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200">Support ChessPlay</button>
                    <button type="button" onClick={() => onNavigate?.("billing")} className="rounded-xl border border-white/10 px-5 py-3 font-bold hover:bg-white/10">View billing history</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => onNavigate?.("dashboard")} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200">Sign in to support</button>
                    <button type="button" onClick={() => onNavigate?.("support")} className="rounded-xl border border-white/10 px-5 py-3 font-bold hover:bg-white/10">View supporter options</button>
                  </>
                )}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="rounded-xl border border-white/10 px-5 py-3 font-bold hover:bg-white/10">Contact support</a>
              </div>
            </div>

            <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-xl font-black">Manual verification</h2>
              <p className="mt-2 text-sm text-slate-400">Payments are manually verified by the admin before supporter access is enabled. Do not share passwords, OTPs, or private banking details.</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <p><b>1.</b> Choose PayPal, UPI, or bank transfer.</p>
                <p><b>2.</b> Complete your contribution.</p>
                <p><b>3.</b> Submit your reference ID from Support or Billing.</p>
              </div>
            </aside>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black">Free plan</h2>
                <StatusBadge>Free</StatusBadge>
              </div>
              <p className="mt-2 text-sm text-slate-400">Core chess features remain available without payment.</p>
              <ul className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                {FREE_FEATURES.map((feature) => <li key={feature}>✓ {feature}</li>)}
              </ul>
            </article>

            <article className="rounded-3xl border border-amber-300/20 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black">Supporter plan</h2>
                <StatusBadge>Supporter</StatusBadge>
              </div>
              <p className="mt-2 text-sm text-slate-400">Support development and receive cosmetic/supporter benefits. Some benefits roll out gradually.</p>
              <div className="mt-5 grid gap-3">
                {SUPPORTER_FEATURES.map((feature) => (
                  <div key={feature.label} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <span className="text-sm font-bold text-slate-200">✓ {feature.label}</span>
                    <StatusBadge>{feature.status}</StatusBadge>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">PayPal / UPI / Bank details</h2>
                <p className="mt-1 text-sm text-slate-400">Only public payment labels are shown here. Private bank credentials should stay out of the repository.</p>
              </div>
              <StatusBadge>Manual Verification</StatusBadge>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <PaymentCard title="PayPal" value={PAYPAL_EMAIL || plans?.paymentMethods?.global?.find((m) => m.id === "paypal")?.paypalEmail} helper="Use your PayPal receipt/reference when submitting verification." onCopy={() => copyToClipboard(PAYPAL_EMAIL || plans?.paymentMethods?.global?.find((m) => m.id === "paypal")?.paypalEmail, setToast)} />
              <PaymentCard title="UPI" value={UPI_ID || plans?.upiId} helper="Use your UTR/reference ID after sending UPI payment." onCopy={() => copyToClipboard(UPI_ID || plans?.upiId, setToast)} />
              <PaymentCard title="Bank transfer" value={BANK_LABEL} helper="Use only the safe public bank label configured in env." onCopy={() => copyToClipboard(BANK_LABEL, setToast)} />
            </div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-xl font-black">Supporter roadmap</h2>
              <ol className="mt-4 grid gap-3 text-sm text-slate-300">
                {ROADMAP.map((item, index) => <li key={item}><b>Phase {index + 1}:</b> {item}</li>)}
              </ol>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-xl font-black">FAQ</h2>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <p><b>Is ChessPlay still free?</b> Yes. Core gameplay, basic puzzles, and basic analysis remain free.</p>
                <p><b>How do I become a supporter?</b> Send a one-time contribution and submit your payment reference for admin verification.</p>
                <p><b>How long does verification take?</b> Manual approval depends on admin availability. You can track status in Billing.</p>
                <p><b>What if my request is rejected?</b> Check the rejection reason, correct your reference details, and submit again.</p>
                <p><b>Is this recurring?</b> Not yet. Current supporter contributions use manual verification, not automatic subscriptions.</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
