import { useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";
import { useTheme } from "../hooks/useTheme";

function AdminCard({ title, description, action, onClick, tone = "amber" }) {
  const toneClass = tone === "emerald" ? "bg-emerald-400 text-black hover:bg-emerald-300" : "bg-amber-300 text-black hover:bg-amber-200";
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-300">{description}</p>
      <button onClick={onClick} className={`mt-5 rounded-2xl px-5 py-3 text-sm font-black transition ${toneClass}`}>
        {action}
      </button>
    </article>
  );
}

export default function AdminDashboardPage({ user, onNavigate, onBack }) {
  const { theme } = useTheme();
  const [status, setStatus] = useState("Checking admin access...");
  const [summary, setSummary] = useState({ pendingRequests: 0, automationReady: 0 });

  useEffect(() => {
    let cancelled = false;

    async function loadAdminSummary() {
      if (!user?.isAdmin) {
        setStatus("Admin access is required for this page.");
        return;
      }

      try {
        const [requestsData, automationData] = await Promise.all([
          apiClient("/api/billing/admin/requests?status=pending").catch(() => ({ requests: [] })),
          apiClient("/api/automation/status").catch(() => ({ status: {} })),
        ]);
        if (cancelled) return;
        setSummary({
          pendingRequests: requestsData.requests?.length || 0,
          automationReady: Object.values(automationData.status || {}).filter(Boolean).length,
        });
        setStatus("");
      } catch (error) {
        if (!cancelled) setStatus(error.message || "Could not load admin summary.");
      }
    }

    loadAdminSummary();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user?.isAdmin) {
    return (
      <div className="min-h-full p-4 sm:p-6 lg:p-8" style={{ color: theme.text.primary }}>
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-center shadow-2xl">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-red-200">Restricted</p>
          <h1 className="mt-3 text-3xl font-black text-white">Admin access required</h1>
          <p className="mt-3 text-slate-300">
            This account is logged in, but it is not marked as an admin. Promote your user with the backend make-admin script or add the email to ADMIN_EMAILS, then log out and log in again.
          </p>
          <button onClick={onBack} className="mt-6 rounded-2xl bg-white px-5 py-3 font-black text-slate-950 hover:bg-slate-200">
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8" style={{ color: theme.text.primary }}>
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-300">ChessPlay Admin</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Admin Panel</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Manage supporter approvals, automation alerts, and production support tasks. Game rules and multiplayer logic are not changed from here.
          </p>
        </div>
        <button onClick={onBack} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/10">
          Back to app
        </button>
      </div>

      {status && <p className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{status}</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Admin</p>
          <p className="mt-2 truncate text-lg font-black text-white">{user.email}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Pending requests</p>
          <p className="mt-2 text-3xl font-black text-amber-300">{summary.pendingRequests}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Automation channels</p>
          <p className="mt-2 text-3xl font-black text-emerald-300">{summary.automationReady}/3</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Mode</p>
          <p className="mt-2 text-lg font-black text-white">Production safe</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard
          title="Supporter Requests"
          description="Review manual UPI/supporter requests, verify proof and UTR, then approve or reject safely."
          action="Open requests"
          onClick={() => onNavigate?.("admin-supporters")}
        />
        <AdminCard
          title="Automation & Bot Center"
          description="Check Telegram/email alert readiness, view automation events, and send controlled admin test alerts."
          action="Open automation"
          tone="emerald"
          onClick={() => onNavigate?.("automation")}
        />
      </div>
    </div>
  );
}
