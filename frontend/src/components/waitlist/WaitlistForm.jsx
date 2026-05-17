import { useState } from "react";
import { apiClient } from "../../services/apiClient";

export default function WaitlistForm({ source = "app", interest = "premium" }) {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const data = await apiClient("/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email, source, interest }),
        skipAuthRefresh: true,
      });
      setNotice(data.duplicate ? "You are already on the list." : "You are on the list.");
      setEmail("");
    } catch (error) {
      setNotice(error.message || "Unable to join waitlist.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email for launch updates"
        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#81b64c]"
      />
      <button type="submit" disabled={busy} className="rounded-xl bg-[#81b64c] px-5 py-3 text-sm font-black text-[#07100a] disabled:opacity-60">
        {busy ? "Joining..." : "Join waitlist"}
      </button>
      {notice ? <p className="self-center text-sm text-slate-300">{notice}</p> : null}
    </form>
  );
}
