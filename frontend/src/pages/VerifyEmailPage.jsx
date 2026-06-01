import { useEffect, useState } from "react";
import {
  AuthBrandHeader,
  AuthStatus,
  PremiumAuthPage,
  PremiumAuthShell,
  PremiumInput,
  PrimaryAuthButton,
  TrustIndicators,
} from "../features/auth/components/PremiumAuthUI";
import { apiClient } from "../services/apiClient";

const RESEND_SECONDS = 60;

export default function VerifyEmailPage({ user, onVerified, onLogout }) {
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("neutral");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!resendIn) return undefined;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const verify = async (event) => {
    event.preventDefault();
    setStatus("");
    setStatusTone("neutral");

    if (!/^\d{6}$/.test(otp.trim())) {
      setStatus("Enter the 6-digit verification code.");
      setStatusTone("error");
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ otp: otp.trim() }),
      });
      setStatus(data.message || "Email verified successfully.");
      setStatusTone("success");
      const session = await apiClient("/api/auth/session", { skipAuthRefresh: true });
      window.setTimeout(() => onVerified?.(session.user || { ...user, emailVerified: true }), 300);
    } catch (error) {
      setStatus(error.message);
      setStatusTone("error");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn || resending) return;
    setResending(true);
    setStatus("");
    setStatusTone("neutral");
    try {
      const data = await apiClient("/api/auth/resend-verification", { method: "POST" });
      setStatus(data.message || "If the account needs verification, a verification code has been sent.");
      setStatusTone("success");
      setResendIn(RESEND_SECONDS);
    } catch (error) {
      setStatus(error.message);
      setStatusTone("error");
      if (error.status === 429) setResendIn(RESEND_SECONDS);
    } finally {
      setResending(false);
    }
  };

  return (
    <PremiumAuthPage>
      <PremiumAuthShell>
        <form onSubmit={verify} noValidate>
          <AuthBrandHeader
            eyebrow="Verify email"
            title="Check your inbox"
            subtitle={`Enter the 6-digit code sent to ${user?.email || "your email"} to unlock ChessPlay.`}
          />

          <div className="space-y-4">
            <PremiumInput
              label="Verification code"
              name="otp"
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                if (status) setStatus("");
              }}
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              autoComplete="one-time-code"
              placeholder="123456"
              error={statusTone === "error" && status.includes("6-digit") ? status : ""}
            />

            <PrimaryAuthButton type="submit" loading={loading} loadingText="Verifying...">
              Verify email
            </PrimaryAuthButton>
          </div>

          <AuthStatus status={statusTone === "error" && status.includes("6-digit") ? "" : status} tone={statusTone} />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={resend}
              disabled={resending || resendIn > 0}
              className="rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-card-strong)] px-4 py-3 text-sm font-black text-[var(--auth-text)] transition hover:-translate-y-0.5 hover:border-[#F4B400] hover:text-[#F4B400] focus:outline-none focus:ring-2 focus:ring-[#F4B400] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendIn ? `Resend in ${resendIn}s` : resending ? "Sending..." : "Resend code"}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-2xl border border-[var(--auth-border)] bg-transparent px-4 py-3 text-sm font-black text-[var(--auth-muted)] transition hover:-translate-y-0.5 hover:border-red-400/50 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-[#F4B400]"
            >
              Log out
            </button>
          </div>

          <TrustIndicators />
        </form>
      </PremiumAuthShell>
    </PremiumAuthPage>
  );
}
