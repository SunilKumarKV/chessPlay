import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";

const TABS = [
  { id: "overview", label: "Overview", icon: "▣" },
  { id: "users", label: "Users", icon: "♙" },
  { id: "games", label: "Games", icon: "♟" },
  { id: "payments", label: "Payments", icon: "₹" },
  { id: "feedback", label: "Feedback", icon: "✉" },
  { id: "reports", label: "Reports", icon: "⚑" },
  { id: "settings", label: "Settings", icon: "⚙" },
  { id: "security", label: "Security", icon: "🛡" },
  { id: "audit", label: "Audit Logs", icon: "☷" },
];

function StatusBadge({ value }) {
  const label = String(value || "unknown");
  const styles = {
    pending: "bg-amber-300/15 text-amber-200 border-amber-300/30",
    approved: "bg-emerald-300/15 text-emerald-200 border-emerald-300/30",
    rejected: "bg-red-300/15 text-red-200 border-red-300/30",
    active: "bg-sky-300/15 text-sky-200 border-sky-300/30",
    banned: "bg-red-300/15 text-red-200 border-red-300/30",
    supporter: "bg-violet-300/15 text-violet-200 border-violet-300/30",
    admin: "bg-amber-300/15 text-amber-200 border-amber-300/30",
    resolved: "bg-emerald-300/15 text-emerald-200 border-emerald-300/30",
    open: "bg-sky-300/15 text-sky-200 border-sky-300/30",
    in_review: "bg-amber-300/15 text-amber-200 border-amber-300/30",
    closed: "bg-slate-300/15 text-slate-200 border-slate-300/30",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black capitalize ${styles[label] || "border-white/10 bg-white/10 text-slate-200"}`}>{label.replace("_", " ")}</span>;
}

function AdminButton({ children, busy, variant = "default", className = "", ...props }) {
  const variants = {
    default: "bg-amber-300 text-slate-950 hover:bg-amber-200",
    ghost: "border border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/10",
    danger: "bg-red-400 text-slate-950 hover:bg-red-300",
    success: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
  };
  return (
    <button disabled={busy || props.disabled} className={`rounded-xl px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`} {...props}>
      {busy ? "Working..." : children}
    </button>
  );
}

function EmptyState({ children }) {
  return <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">{children}</div>;
}

function LoadingRows() {
  return <div className="grid gap-3">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-white/[0.06]" />)}</div>;
}

function Card({ children, className = "" }) {
  return <section className={`rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl ${className}`}>{children}</section>;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminPanelPage({ user, onBack }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [data, setData] = useState({});
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("pending");
  const [gameFilter, setGameFilter] = useState("all");
  const [feedbackFilter, setFeedbackFilter] = useState("open");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const endpoint = useMemo(() => {
    if (activeTab === "overview") return "/api/admin/overview";
    if (activeTab === "users") return `/api/admin/users?q=${encodeURIComponent(search)}`;
    if (activeTab === "games") return `/api/admin/games?status=${encodeURIComponent(gameFilter)}`;
    if (activeTab === "payments") return `/api/admin/payments?status=${encodeURIComponent(paymentFilter)}`;
    if (activeTab === "feedback" || activeTab === "reports") return `/api/admin/feedback?status=${encodeURIComponent(feedbackFilter)}`;
    if (activeTab === "settings") return "/api/admin/settings";
    if (activeTab === "security") return "/api/admin/security";
    if (activeTab === "audit") return "/api/admin/audit-logs";
    return "/api/admin/overview";
  }, [activeTab, feedbackFilter, gameFilter, paymentFilter, search]);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice({ type: "", text: "" });
    try {
      const response = await apiClient(endpoint);
      setData((current) => ({ ...current, [activeTab]: response }));
    } catch (error) {
      setNotice({ type: "error", text: error.status === 401 ? "Session expired. Please login again." : error.message || "Unable to load admin data. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [activeTab, endpoint]);

  useEffect(() => {
    const timer = window.setTimeout(load, activeTab === "users" ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, activeTab, search]);

  const runAction = async (key, action, successText) => {
    setBusyKey(key);
    setNotice({ type: "", text: "" });
    try {
      await action();
      setNotice({ type: "success", text: successText });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error.status === 401 ? "Session expired. Please login again." : error.message || "Action failed. Please try again." });
    } finally {
      setBusyKey("");
    }
  };

  if (!user) {
    return <AccessState title="Login required" message="Please login with an admin account to continue." onBack={onBack} />;
  }

  if (!user.isAdmin) {
    return <AccessState title="Access denied" message="Your account does not have admin permission." onBack={onBack} />;
  }

  const current = data[activeTab] || {};

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(129,182,76,0.16),transparent_35%),linear-gradient(135deg,#080b10,#111827_50%,#171512)] text-slate-100">
      <div className="flex min-h-full flex-col lg:flex-row">
        <aside className={`${mobileMenuOpen ? "block" : "hidden"} border-b border-white/10 bg-black/40 p-4 lg:block lg:w-72 lg:border-b-0 lg:border-r lg:p-5`}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">ChessPlay</p>
              <h1 className="text-2xl font-black">Admin Panel</h1>
            </div>
            <button className="lg:hidden" onClick={() => setMobileMenuOpen(false)}>✕</button>
          </div>
          <nav className="grid gap-2">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-black transition ${activeTab === tab.id ? "bg-amber-300 text-slate-950" : "border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/10"}`}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}
          </nav>
          <AdminButton variant="ghost" className="mt-5 w-full" onClick={onBack}>← Back to App</AdminButton>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <button className="mb-3 rounded-xl border border-white/10 px-3 py-2 font-bold lg:hidden" onClick={() => setMobileMenuOpen(true)}>☰ Admin Menu</button>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">Production control</p>
              <h2 className="text-3xl font-black sm:text-4xl">{TABS.find((tab) => tab.id === activeTab)?.label}</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">Only verified admin accounts can view or change these controls. Every important action is audit logged.</p>
            </div>
            <AdminButton variant="ghost" onClick={load} busy={loading}>Refresh</AdminButton>
          </div>

          {notice.text && <div className={`mb-4 rounded-2xl border p-4 text-sm font-bold ${notice.type === "success" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-red-300/30 bg-red-300/10 text-red-100"}`}>{notice.text}</div>}

          {loading ? <LoadingRows /> : (
            <>
              {activeTab === "overview" && <Overview data={current} />}
              {activeTab === "users" && <Users data={current} search={search} setSearch={setSearch} busyKey={busyKey} runAction={runAction} />}
              {activeTab === "games" && <Games data={current} filter={gameFilter} setFilter={setGameFilter} busyKey={busyKey} runAction={runAction} />}
              {activeTab === "payments" && <Payments data={current} filter={paymentFilter} setFilter={setPaymentFilter} busyKey={busyKey} runAction={runAction} />}
              {(activeTab === "feedback" || activeTab === "reports") && <Feedback data={current} filter={feedbackFilter} setFilter={setFeedbackFilter} busyKey={busyKey} runAction={runAction} />}
              {activeTab === "settings" && <Settings data={current} busyKey={busyKey} runAction={runAction} />}
              {activeTab === "security" && <Security data={current} />}
              {activeTab === "audit" && <Audit data={current} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function AccessState({ title, message, onBack }) {
  return <div className="grid min-h-full place-items-center p-6 text-slate-100"><Card className="max-w-lg text-center"><h1 className="text-3xl font-black">{title}</h1><p className="mt-3 text-slate-400">{message}</p><AdminButton className="mt-5" onClick={onBack}>Back</AdminButton></Card></div>;
}

function Overview({ data }) {
  const stats = data.stats || {};
  const cards = [
    ["Total users", stats.totalUsers || 0],
    ["Total games", stats.totalGames || 0],
    ["Active users", stats.activeUsers || 0],
    ["Pending payments", stats.pendingRequests || 0],
    ["Latest reports", stats.latestReports || 0],
    ["Suspicious games", stats.suspiciousGames || 0],
  ];
  return <div className="grid gap-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value]) => <Card key={label}><p className="text-sm font-bold text-slate-400">{label}</p><p className="mt-2 text-4xl font-black text-white">{value}</p></Card>)}</div><Card><h3 className="mb-4 text-xl font-black">Latest reports/issues</h3>{(data.latestReports || []).length ? <div className="grid gap-3">{data.latestReports.map((ticket) => <div key={ticket._id} className="rounded-2xl border border-white/10 p-4"><div className="flex flex-wrap justify-between gap-2"><b>{ticket.subject}</b><StatusBadge value={ticket.status} /></div><p className="mt-1 text-sm text-slate-400">{ticket.user?.email || "Unknown user"} · {formatDate(ticket.createdAt)}</p></div>)}</div> : <EmptyState>No reports found</EmptyState>}</Card></div>;
}

function Users({ data, search, setSearch, busyKey, runAction }) {
  const users = data.users || [];
  return <div className="grid gap-4"><Card><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by email or username" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-300" /></Card>{users.length ? users.map((user) => <Card key={user.id}><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black">{user.username}</h3>{user.isAdmin && <StatusBadge value="admin" />}{user.isBanned && <StatusBadge value="banned" />}{user.isSupporter && <StatusBadge value="supporter" />}</div><p className="text-sm text-slate-400">{user.email}</p><p className="mt-1 text-sm text-slate-400">Rating {user.rating} · Games {user.gamesPlayed} · Plan {user.plan}</p></div><div className="flex flex-wrap gap-2"><AdminButton variant="ghost" busy={busyKey === `games-${user.id}`} onClick={() => runAction(`games-${user.id}`, async () => apiClient(`/api/admin/users/${user.id}/games`), "User game history loaded successfully.")}>View games</AdminButton><AdminButton variant={user.isAdmin ? "danger" : "success"} busy={busyKey === `admin-${user.id}`} onClick={() => window.confirm(user.isAdmin ? "Demote this admin?" : "Promote this user to admin?") && runAction(`admin-${user.id}`, async () => apiClient(`/api/admin/users/${user.id}/admin`, { method: "PATCH", body: JSON.stringify({ isAdmin: !user.isAdmin }) }), "User updated successfully.")}>{user.isAdmin ? "Demote admin" : "Promote admin"}</AdminButton><AdminButton variant={user.isBanned ? "success" : "danger"} busy={busyKey === `ban-${user.id}`} onClick={() => { const reason = user.isBanned ? "" : window.prompt("Ban reason", "Policy violation"); if (user.isBanned || reason) runAction(`ban-${user.id}`, async () => apiClient(`/api/admin/users/${user.id}/ban`, { method: "PATCH", body: JSON.stringify({ isBanned: !user.isBanned, reason }) }), user.isBanned ? "User unbanned successfully." : "User banned successfully."); }}>{user.isBanned ? "Unban" : "Ban"}</AdminButton></div></div></Card>) : <EmptyState>No users matched your search</EmptyState>}</div>;
}

function Games({ data, filter, setFilter, busyKey, runAction }) {
  const games = data.games || [];
  return <div className="grid gap-4"><FilterButtons values={["all", "active", "completed", "abandoned"]} current={filter} setCurrent={setFilter} />{games.length ? games.map((game) => <Card key={game._id}><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-black">{game.whitePlayer?.username || "White"} vs {game.blackPlayer?.username || "Black/AI"}</h3><p className="text-sm text-slate-400">Result: {game.result} · Moves: {game.moves?.length || 0} · {formatDate(game.startTime)}</p></div><AdminButton variant="ghost" busy={busyKey === `review-${game._id}`} onClick={() => runAction(`review-${game._id}`, async () => apiClient(`/api/admin/games/${game._id}/review`, { method: "PATCH", body: JSON.stringify({ note: "Reviewed from admin panel" }) }), "Game marked reviewed.")}>Mark reviewed</AdminButton></div></Card>) : <EmptyState>No games found for this filter.</EmptyState>}</div>;
}

function Payments({ data, filter, setFilter, busyKey, runAction }) {
  const requests = data.requests || [];
  return <div className="grid gap-4"><FilterButtons values={["pending", "approved", "rejected"]} current={filter} setCurrent={setFilter} />{requests.length ? requests.map((request) => <Card key={request._id}><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black">{request.user?.username || "Unknown user"}</h3><StatusBadge value={request.status} /></div><p className="text-sm text-slate-400">{request.user?.email}</p><p className="mt-2 text-sm text-slate-300">Plan <b>{request.plan}</b> · Amount <b>{request.currency === "USD" ? "$" : "₹"}{request.amount}</b> · Method <b>{request.paymentMethod}</b></p><p className="break-all text-sm text-slate-400">Reference: {request.utr || request.bankReference || request.providerReference || "—"}</p>{request.paymentProofUrl && <a href={request.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-black text-amber-300 underline">Open proof</a>}</div>{request.status === "pending" && <div className="flex flex-wrap gap-2"><AdminButton variant="success" busy={busyKey === `approve-${request._id}`} onClick={() => window.confirm("Approve this supporter payment?") && runAction(`approve-${request._id}`, async () => apiClient(`/api/billing/admin/requests/${request._id}/approve`, { method: "PATCH" }), "Payment request approved successfully.")}>Approve</AdminButton><AdminButton variant="danger" busy={busyKey === `reject-${request._id}`} onClick={() => { const reason = window.prompt("Reason for rejection", "Payment could not be verified"); if (reason) runAction(`reject-${request._id}`, async () => apiClient(`/api/billing/admin/requests/${request._id}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) }), "Payment request rejected successfully."); }}>Reject</AdminButton></div>}</div></Card>) : <EmptyState>No payment requests yet</EmptyState>}</div>;
}

function Feedback({ data, filter, setFilter, busyKey, runAction }) {
  const tickets = data.tickets || [];
  return <div className="grid gap-4"><FilterButtons values={["open", "in_review", "resolved", "closed"]} current={filter} setCurrent={setFilter} />{tickets.length ? tickets.map((ticket) => <Card key={ticket._id}><div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black">{ticket.subject}</h3><StatusBadge value={ticket.status} /></div><p className="text-sm text-slate-400">{ticket.user?.email || "Unknown user"} · {ticket.type}</p><p className="mt-2 text-sm text-slate-300">{ticket.message}</p>{ticket.adminNotes && <p className="mt-2 rounded-xl bg-white/[0.04] p-3 text-sm text-slate-300">Admin note: {ticket.adminNotes}</p>}</div><div className="flex flex-wrap gap-2"><AdminButton variant="ghost" busy={busyKey === `progress-${ticket._id}`} onClick={() => runAction(`progress-${ticket._id}`, async () => apiClient(`/api/admin/feedback/${ticket._id}`, { method: "PATCH", body: JSON.stringify({ status: "in_review" }) }), "Feedback moved to review.")}>In review</AdminButton><AdminButton variant="success" busy={busyKey === `resolve-${ticket._id}`} onClick={() => { const adminNotes = window.prompt("Admin note", ticket.adminNotes || "Resolved by admin"); if (adminNotes !== null) runAction(`resolve-${ticket._id}`, async () => apiClient(`/api/admin/feedback/${ticket._id}`, { method: "PATCH", body: JSON.stringify({ status: "resolved", adminNotes }) }), "Feedback updated successfully."); }}>Resolve</AdminButton></div></div></Card>) : <EmptyState>No reports found</EmptyState>}</div>;
}

function Settings({ data, busyKey, runAction }) {
  const [form, setForm] = useState(data.settings || { maintenanceMode: false, supporterPlanVisible: true, adsEnabled: true, announcementBanner: "" });
  useEffect(() => setForm(data.settings || { maintenanceMode: false, supporterPlanVisible: true, adsEnabled: true, announcementBanner: "" }), [data.settings]);
  const toggle = (key) => setForm((current) => ({ ...current, [key]: !current[key] }));
  return <Card><div className="grid gap-4"><Toggle label="Maintenance mode" value={form.maintenanceMode} onChange={() => toggle("maintenanceMode")} /><Toggle label="Show supporter plans" value={form.supporterPlanVisible} onChange={() => toggle("supporterPlanVisible")} /><Toggle label="Enable ads" value={form.adsEnabled} onChange={() => toggle("adsEnabled")} /><label className="grid gap-2"><span className="font-bold text-slate-300">Announcement banner</span><textarea value={form.announcementBanner || ""} onChange={(e) => setForm({ ...form, announcementBanner: e.target.value })} rows={3} className="rounded-2xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-amber-300" placeholder="Optional production announcement" /></label><AdminButton busy={busyKey === "settings"} onClick={() => runAction("settings", async () => apiClient("/api/admin/settings", { method: "PATCH", body: JSON.stringify(form) }), "Settings updated successfully.")}>Save settings</AdminButton></div></Card>;
}

function Security({ data }) {
  return <div className="grid gap-5 xl:grid-cols-2"><Card><h3 className="mb-4 text-xl font-black">Suspicious IPs</h3>{(data.suspiciousIps || []).length ? <div className="grid gap-2">{data.suspiciousIps.map((ip) => <div key={ip._id} className="rounded-2xl border border-white/10 p-3"><b>{ip._id}</b><p className="text-sm text-slate-400">Failed logins: {ip.failures} · Last seen {formatDate(ip.lastSeen)}</p></div>)}</div> : <EmptyState>No suspicious IPs found</EmptyState>}</Card><Card><h3 className="mb-4 text-xl font-black">Admin login history</h3>{(data.adminLogins || []).length ? <div className="grid gap-2">{data.adminLogins.map((event) => <div key={event._id} className="rounded-2xl border border-white/10 p-3"><b>{event.email || event.user?.email}</b><p className="text-sm text-slate-400">{event.ip} · {formatDate(event.createdAt)}</p></div>)}</div> : <EmptyState>No admin login history yet</EmptyState>}</Card></div>;
}

function Audit({ data }) {
  const logs = data.logs || [];
  return <div className="grid gap-3">{logs.length ? logs.map((log) => <Card key={log._id}><div className="flex flex-wrap justify-between gap-2"><b>{log.action}</b><span className="text-sm text-slate-400">{formatDate(log.createdAt)}</span></div><p className="mt-1 text-sm text-slate-400">Actor: {log.actor?.email || "System"} · Target: {log.targetType} / {log.targetId}</p></Card>) : <EmptyState>No audit logs yet</EmptyState>}</div>;
}

function FilterButtons({ values, current, setCurrent }) {
  return <div className="flex flex-wrap gap-2">{values.map((value) => <button key={value} onClick={() => setCurrent(value)} className={`rounded-xl px-4 py-2 text-sm font-black capitalize ${current === value ? "bg-amber-300 text-slate-950" : "border border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/10"}`}>{value.replace("_", " ")}</button>)}</div>;
}

function Toggle({ label, value, onChange }) {
  return <button type="button" onClick={onChange} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left"><span className="font-bold">{label}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${value ? "bg-emerald-300 text-slate-950" : "bg-slate-700 text-slate-200"}`}>{value ? "ON" : "OFF"}</span></button>;
}
