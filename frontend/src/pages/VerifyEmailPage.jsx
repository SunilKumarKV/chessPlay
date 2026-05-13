import { useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";

export default function VerifyEmailPage({ onBack }) {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const [status, setStatus] = useState("Verifying your email...");

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setStatus("Verification token is missing. Please request a fresh link.");
        return;
      }

      try {
        const data = await apiClient("/api/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        setStatus(data.message || "Email verified successfully.");
      } catch (error) {
        setStatus(error.message);
      }
    }

    verifyEmail();
  }, [token]);

  return (
    <main className="min-h-screen bg-[#0b0f14] px-6 py-10 text-white">
      <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl shadow-black/30">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-xl bg-[#81b64c] text-2xl font-black text-black">
          @
        </div>
        <h1 className="mb-2 text-2xl font-black">Email verification</h1>
        <p className="mb-6 text-sm text-slate-300">{status}</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg bg-[#81b64c] px-5 py-3 font-bold text-black"
        >
          Continue
        </button>
      </section>
    </main>
  );
}
