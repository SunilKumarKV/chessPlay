import { useState } from "react";
import { apiClient } from "../../services/apiClient";

export default function DeleteAccountPage({ onBack, onDeleted }) {
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirm !== "DELETE") {
      setStatus('Type DELETE to confirm account deletion.');
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      await apiClient("/api/auth/account", { method: "DELETE" });
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("guestMode");
      setStatus("Account deleted.");
      onDeleted?.();
    } catch (error) {
      setStatus(error.message || "Could not delete account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg-primary,#0b0f14)] px-6 py-10 text-[var(--text-primary,#f8fafc)]">
      <div className="mx-auto max-w-xl rounded-2xl border border-red-500/30 bg-red-950/20 p-6 shadow-2xl">
        <button onClick={onBack} className="mb-6 rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/10">← Back</button>
        <h1 className="mb-3 text-3xl font-black">Delete Account</h1>
        <p className="mb-5 text-slate-300">This anonymizes your profile and revokes active sessions. Type <b>DELETE</b> to continue.</p>
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mb-3 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 outline-none" placeholder="Type DELETE" />
        <button onClick={handleDelete} disabled={loading} className="rounded-lg bg-red-500 px-5 py-3 font-bold text-white disabled:opacity-60">{loading ? "Deleting..." : "Delete my account"}</button>
        {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}
      </div>
    </main>
  );
}
