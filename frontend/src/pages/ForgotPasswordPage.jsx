import { useEffect, useState } from "react";
import {
  AuthBrandHeader,
  AuthStatus,
  PremiumAuthPage,
  PremiumAuthShell,
  PremiumInput,
  PremiumPasswordInput,
  PrimaryAuthButton,
  TrustIndicators,
} from "../features/auth/components/PremiumAuthUI";
import { apiClient } from "../services/apiClient";
import { validateProductionEmail } from "../utils/emailValidation";

const RESEND_COOLDOWN_SECONDS = 60;

function validatePassword(password) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/\d/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a symbol.";
  return "";
}

export default function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState("");
  const [requestedEmail, setRequestedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("neutral");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [sent, setSent] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  useEffect(() => {
    if (!resendIn) return undefined;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const requestReset = async (event) => {
    event.preventDefault();
    setStatus("");
    setStatusTone("neutral");
    const emailError = validateProductionEmail(email);
    if (emailError) {
      setStatus(emailError);
      setStatusTone("error");
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setRequestedEmail(email.trim().toLowerCase());
      setSent(true);
      setStatus(response.message || "If an account exists, a reset code has been sent.");
      setStatusTone("success");
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setStatus(error.message);
      setStatusTone("error");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setStatus("");
    setStatusTone("neutral");
    if (!/^[0-9]{6}$/.test(otp.trim())) {
      setStatus("Enter the 6-digit reset code.");
      setStatusTone("error");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setStatus(passwordError);
      setStatusTone("error");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      setStatusTone("error");
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: requestedEmail || email.trim().toLowerCase(), otp: otp.trim(), password }),
      });
      setStatus(data.message || "Password reset successful. Please sign in.");
      setStatusTone("success");
      setResetComplete(true);
    } catch (error) {
      setStatus(error.message);
      setStatusTone("error");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn || resending) return;
    if (!requestedEmail) {
      setStatus("Enter your email first.");
      setStatusTone("error");
      return;
    }
    setResending(true);
    setStatus("");
    setStatusTone("neutral");
    try {
      const response = await apiClient("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: requestedEmail }),
      });
      setStatus(response.message || "If an account exists, a reset code has been sent.");
      setStatusTone("success");
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setSent(true);
    } catch (error) {
      setStatus(error.message);
      setStatusTone("error");
      if (error.status === 429) setResendIn(RESEND_COOLDOWN_SECONDS);
    } finally {
      setResending(false);
    }
  };

  return (
    <PremiumAuthPage>
      <PremiumAuthShell>
        <form onSubmit={sent ? submitReset : requestReset} noValidate>
          <AuthBrandHeader
            eyebrow="Account recovery"
            title={resetComplete ? "Password reset complete" : sent ? "Enter reset code" : "Reset your password"}
            subtitle={
              resetComplete
                ? "Your password has been updated. Sign in with your new password."
                : sent
                ? `A 6-digit code was sent to ${requestedEmail || email.trim().toLowerCase()}. Enter it below with a new password.`
                : "Enter your verified email and we’ll send a secure 6-digit reset code."
            }
          />

          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-5 rounded-xl border border-[var(--auth-border)] bg-[var(--auth-card-strong)] px-4 py-2 text-sm font-black text-[var(--auth-text)] transition hover:-translate-y-0.5 hover:border-[#F4B400] hover:text-[#F4B400] focus:outline-none focus:ring-2 focus:ring-[#F4B400]"
            >
              Back
            </button>
          ) : null}

          <div className="space-y-4">
            <PremiumInput
              label="Email"
              id="forgot-password-email"
              name="email"
              value={requestedEmail || email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status) setStatus("");
              }}
              type="email"
              required
              autoComplete="email"
              placeholder="name@gmail.com"
              disabled={sent}
              error={statusTone === "error" && !sent ? status : ""}
            />

            {sent && !resetComplete ? (
              <>
                <PremiumInput
                  label="Reset code"
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
                <PremiumPasswordInput
                  label="New password"
                  name="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (status) setStatus("");
                  }}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                />
                <PremiumPasswordInput
                  label="Confirm password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (status) setStatus("");
                  }}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                />
              </>
            ) : null}

            <PrimaryAuthButton type="submit" loading={loading} loadingText={sent ? "Resetting password..." : "Sending reset code..."}>
              {resetComplete ? "Password reset complete" : sent ? "Reset password" : "Send reset code"}
            </PrimaryAuthButton>
          </div>

          <AuthStatus status={status} tone={statusTone} />

          {sent && !resetComplete ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={resend}
                disabled={resending || resendIn > 0}
                className="rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-card-strong)] px-4 py-3 text-sm font-black text-[var(--auth-text)] transition hover:-translate-y-0.5 hover:border-[#F4B400] hover:text-[#F4B400] focus:outline-none focus:ring-2 focus:ring-[#F4B400] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendIn ? `Resend in ${resendIn}s` : resending ? "Sending..." : "Resend reset code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/login";
                }}
                className="rounded-2xl border border-[var(--auth-border)] bg-transparent px-4 py-3 text-sm font-black text-[var(--auth-muted)] transition hover:-translate-y-0.5 hover:border-red-400/50 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-[#F4B400]"
              >
                Back to sign in
              </button>
            </div>
          ) : null}

          {resetComplete ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/login";
                }}
                className="w-full rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-card-strong)] px-4 py-3 text-sm font-black text-[var(--auth-text)] transition hover:-translate-y-0.5 hover:border-[#F4B400] hover:text-[#F4B400] focus:outline-none focus:ring-2 focus:ring-[#F4B400]"
              >
                Sign in
              </button>
            </div>
          ) : null}

          <TrustIndicators />
        </form>
      </PremiumAuthShell>
    </PremiumAuthPage>
  );
}
