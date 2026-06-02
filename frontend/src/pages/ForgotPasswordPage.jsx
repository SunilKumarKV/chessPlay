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
import { Button, Card } from "../components/ui";
import { apiClient } from "../services/apiClient";
import { validateProductionEmail } from "../utils/emailValidation";

const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_OTP_ENABLED = import.meta.env.VITE_EMAIL_OTP_ENABLED === "true";
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || "support@getchessplay.com";

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

  if (!EMAIL_OTP_ENABLED) {
    return (
      <PremiumAuthPage>
        <PremiumAuthShell>
          <AuthBrandHeader
            eyebrow="Account recovery"
            title="Temporarily unavailable"
            subtitle="Password reset is temporarily unavailable."
          />
          {onBack ? (
            <Button
              type="button"
              onClick={onBack}
              variant="secondary"
              size="sm"
              className="mb-5"
            >
              Back
            </Button>
          ) : null}
          <div className="space-y-4">
            <Card variant="subtle" className="p-4 text-center text-sm">
              Password reset features are temporarily unavailable. Please contact{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold text-[var(--color-primary)] hover:underline"
              >
                support
              </a>
              {" "}for assistance.
            </Card>
            <a
              href="/login"
              className="ds-focus block min-h-11 rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface-strong)] px-4 py-3 text-center text-sm font-black text-[var(--color-text-primary)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:text-[var(--color-primary)]"
            >
              Sign in
            </a>
          </div>
        </PremiumAuthShell>
      </PremiumAuthPage>
    );
  }

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
            <Button
              type="button"
              onClick={onBack}
              variant="secondary"
              size="sm"
              className="mb-5"
            >
              Back
            </Button>
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
              <Button
                type="button"
                onClick={resend}
                disabled={resending || resendIn > 0}
                variant="secondary"
              >
                {resendIn ? `Resend in ${resendIn}s` : resending ? "Sending..." : "Resend reset code"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  window.location.href = "/login";
                }}
                variant="ghost"
              >
                Back to sign in
              </Button>
            </div>
          ) : null}

          {resetComplete ? (
            <div className="mt-4">
              <Button
                type="button"
                onClick={() => {
                  window.location.href = "/login";
                }}
                variant="secondary"
                className="w-full"
              >
                Sign in
              </Button>
            </div>
          ) : null}

          <TrustIndicators />
        </form>
      </PremiumAuthShell>
    </PremiumAuthPage>
  );
}
