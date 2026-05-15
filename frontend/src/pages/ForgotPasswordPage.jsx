import { useState } from "react";
import { apiClient } from "../services/apiClient";

export default function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const data = await apiClient("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStatus(data.message);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0f14] px-6 py-10 text-white">
      <form onSubmit={submit} className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <button type="button" onClick={onBack} className="mb-6 rounded-lg border border-white/10 px-4 py-2 text-sm">← Back</button>
        <h1 className="mb-2 text-2xl font-black">Forgot password</h1>
        <p className="mb-5 text-sm text-slate-400">Enter your verified email and we’ll send a reset link.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3" placeholder="you@gmail.com" />
        <button disabled={loading} className="w-full rounded-lg bg-[#81b64c] px-4 py-3 font-bold text-black">{loading ? "Sending..." : "Send reset link"}</button>
        {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}
      </form>
    </main>
  );
}
