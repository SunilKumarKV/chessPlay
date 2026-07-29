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
import { Button } from "../components/ui";
import { apiClient } from "../services/apiClient";

const RESEND_SECONDS = 60;
const EMAIL_OTP_ENABLED = import.meta.env.VITE_EMAIL_OTP_ENABLED === "true";

export default function VerifyEmailPage({ user, onVerified, onLogout }) {
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("neutral");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [backendRequiresOtp, setBackendRequiresOtp] = useState(false);

  useEffect(() => {
    if (!resendIn) return undefined;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (EMAIL_OTP_ENABLED) return;
    let cancelled = false;

    async function syncVerificationState() {
      try {
        const session = await apiClient("/api/auth/session", { skipAuthRefresh: true });
        if (cancelled) return;
        if (session.user?.emailVerified !== false) {
          onVerified?.(session.user || { ...user, emailVerified: true });
          return;
        }
        setBackendRequiresOtp(true);
        setStatus("Email verification is required for this account. Request a fresh code to continue.");
        setStatusTone("error");
      } catch {
        if (!cancelled) {
          setBackendRequiresOtp(true);
          setStatus("We could not confirm your verification state. Please try again or log out.");
          setStatusTone("error");
        }
      }
    }

    syncVerificationState();
    return () => {
      cancelled = true;
    };
  }, [onVerified, user]);

  if (!EMAIL_OTP_ENABLED && !backendRequiresOtp) {
    return null;
  }

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
            <Button
              type="button"
              onClick={resend}
              disabled={resending || resendIn > 0}
              variant="secondary"
            >
              {resendIn ? `Resend in ${resendIn}s` : resending ? "Sending..." : "Resend code"}
            </Button>
            <Button
              type="button"
              onClick={onLogout}
              variant="ghost"
            >
              Log out
            </Button>
          </div>

          <TrustIndicators />
        </form>
      </PremiumAuthShell>
    </PremiumAuthPage>
  );
}
