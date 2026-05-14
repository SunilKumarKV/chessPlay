import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../services/apiClient";
import { useTheme } from "../hooks/useTheme";

const channels = ["telegram", "email", "whatsapp"];

function StatusPill({ active, label }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30" : "bg-slate-500/10 text-slate-300 border border-slate-400/20"}`}>
      {label}: {active ? "Ready" : "Setup needed"}
    </span>
  );
}

export default function AutomationPage({ onBack }) {
  const { theme } = useTheme();
  const [status, setStatus] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: "payment", subject: "Payment approval help", message: "I need help with my ChessPlay payment.", relatedPaymentReference: "" });

  const configuredCount = useMemo(() => status ? Object.values(status.status || {}).filter(Boolean).length : 0, [status]);

  async function load() {
    setLoading(true);
    try {
      const [statusData, eventsData] = await Promise.all([
        apiClient("/api/automation/status"),
        apiClient("/api/automation/events").catch(() => ({ events: [] })),
      ]);
      setStatus(statusData);
      setEvents(eventsData.events || []);
      const ticketsData = await apiClient("/api/automation/tickets").catch(() => ({ tickets: [] }));
      setTickets(ticketsData.tickets || []);
    } catch (error) {
      setMessage(error.message || "Could not load automation data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitTicket(event) {
    event.preventDefault();
    setMessage("");
    try {
      await apiClient("/api/automation/support-ticket", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage("Support ticket created. Admin bot notification queued.");
      setForm((current) => ({ ...current, message: "", relatedPaymentReference: "" }));
      load();
    } catch (error) {
      setMessage(error.message || "Could not create ticket");
    }
  }

  async function sendTest() {
    setMessage("");
    try {
      await apiClient("/api/automation/test", {
        method: "POST",
        body: JSON.stringify({ channels }),
      });
      setMessage("Test alert sent/queued. Check Telegram or email logs. WhatsApp is reserved for the next update.");
      load();
    } catch (error) {
      setMessage(error.status === 403 ? "Admin only: add your email to ADMIN_EMAILS or make yourself admin." : error.message);
    }
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8" style={{ color: theme.text.primary }}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={onBack} className="mb-3 text-sm font-semibold text-amber-300 hover:text-amber-200">← Back</button>
          <h1 className="text-3xl font-black">Automation & Bot Center</h1>
          <p className="mt-2 max-w-3xl text-sm" style={{ color: theme.text.secondary }}>
            Direct Node.js Telegram and email alerts for payments, support tickets, refunds, and FAQ requests. WhatsApp is kept for the next update.
          </p>
        </div>
        <button onClick={sendTest} className="rounded-2xl bg-amber-400 px-5 py-3 font-bold text-black shadow-lg shadow-amber-500/20">
          Send test alert
        </button>
      </div>

      {message && <div className="mb-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">{message}</div>}

      <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold">Bot connection status</h2>
            <p className="text-sm" style={{ color: theme.text.secondary }}>{configuredCount}/3 channels configured.</p>
          </div>
          {loading && <span className="text-sm text-slate-300">Loading...</span>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {channels.map((channel) => <StatusPill key={channel} label={channel.toUpperCase()} active={Boolean(status?.status?.[channel])} />)}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <form onSubmit={submitTicket} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur">
          <h2 className="text-xl font-extrabold">Create support/refund ticket</h2>
          <p className="mt-1 text-sm" style={{ color: theme.text.secondary }}>This triggers admin alerts automatically.</p>
          <label className="mt-4 block text-sm font-semibold">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white">
            <option value="payment">Payment approval</option>
            <option value="refund">Refund request</option>
            <option value="faq">FAQ question</option>
            <option value="bug">Bug report</option>
            <option value="premium">Premium support</option>
            <option value="account">Account issue</option>
            <option value="general">General</option>
          </select>
          <label className="mt-4 block text-sm font-semibold">Subject</label>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white" />
          <label className="mt-4 block text-sm font-semibold">Payment/reference ID</label>
          <input value={form.relatedPaymentReference} onChange={(e) => setForm({ ...form, relatedPaymentReference: e.target.value })} placeholder="Optional UTR / PayPal / Stripe reference" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white" />
          <label className="mt-4 block text-sm font-semibold">Message</label>
          <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white" />
          <button className="mt-4 w-full rounded-2xl bg-emerald-400 px-5 py-3 font-bold text-black">Submit ticket</button>
        </form>

        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur">
          <h2 className="text-xl font-extrabold">Latest automation events</h2>
          <div className="mt-4 max-h-[470px] space-y-3 overflow-auto pr-2">
            {events.length === 0 && <p className="text-sm" style={{ color: theme.text.secondary }}>No automation events yet.</p>}
            {events.map((event) => (
              <article key={event._id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold">{event.title}</h3>
                  <span className={`rounded-full px-2 py-1 text-xs ${event.status === "sent" ? "bg-emerald-400/20 text-emerald-200" : event.status === "failed" ? "bg-red-400/20 text-red-200" : "bg-amber-400/20 text-amber-100"}`}>{event.status}</span>
                </div>
                <p className="mt-2 text-sm" style={{ color: theme.text.secondary }}>{event.message}</p>
                <p className="mt-2 text-xs text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {tickets.length > 0 && (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur">
          <h2 className="text-xl font-extrabold">Admin ticket queue</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {tickets.map((ticket) => (
              <div key={ticket._id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">{ticket.subject}</h3>
                  <span className="rounded-full bg-sky-400/15 px-2 py-1 text-xs text-sky-200">{ticket.status}</span>
                </div>
                <p className="mt-2 text-sm" style={{ color: theme.text.secondary }}>{ticket.message}</p>
                <p className="mt-2 text-xs text-slate-400">{ticket.user?.email || "User"} • {ticket.type}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
