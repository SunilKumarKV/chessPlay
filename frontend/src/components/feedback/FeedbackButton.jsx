import { useState } from "react";
import { apiClient } from "../../services/apiClient";
import { trackEvent } from "../../services/analytics";

const CATEGORIES = ["bug", "feature", "payment", "general"];

export default function FeedbackButton({ user }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setNotice("");
    try {
      await apiClient("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ category, message, email, page: window.location.pathname }),
        skipAuthRefresh: true,
      });
      trackEvent("feedback_submit", { category });
      setNotice("Thanks. Feedback submitted.");
      setMessage("");
      window.setTimeout(() => setOpen(false), 900);
    } catch (error) {
      setNotice(error.message || "Unable to submit feedback.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ds-focus fixed bottom-4 right-4 z-[var(--z-content)] rounded-full border border-[var(--color-border-primary)] bg-[var(--color-bg-glass)] px-4 py-3 text-sm font-black text-[var(--color-text-primary)] shadow-[var(--shadow-md)] backdrop-blur transition hover:bg-[var(--color-surface-strong)]"
      >
        Feedback
      </button>
      {open ? (
        <div className="fixed inset-0 z-[var(--z-modal)] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#101816] p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#b8f28f]">ChessPlay feedback</p>
                <h2 className="mt-2 font-['Montserrat'] text-2xl font-black">Tell us what to improve</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-black">×</button>
            </div>
            <div className="mt-5 grid gap-3">
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none">
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {!user ? (
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email optional" className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none" />
              ) : null}
              <textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 2000))} rows={5} placeholder="What happened or what should we build?" className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none" />
              {notice ? <p className="text-sm text-slate-300">{notice}</p> : null}
              <button type="button" disabled={busy || message.trim().length < 8} onClick={submit} className="rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100a] disabled:opacity-60">
                {busy ? "Sending..." : "Submit feedback"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
