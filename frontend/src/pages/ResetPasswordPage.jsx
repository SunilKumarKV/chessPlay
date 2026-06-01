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

const RESEND_COOLDOWN_SECONDS = 60;

function validatePassword(password) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/\d/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a symbol.";
  return "";
}

export default function ResetPasswordPage({ onBack }) {
  const params = new URLSearchParams(window.location.search);
  const initialEmail = params.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const submit = async (event) => {
    event.preventDefault();
    setStatus("");
    setStatusTone("neutral");

    if (!email.trim()) {
      setStatus("Email is required.");
      setStatusTone("error");
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
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
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim(), password }),
      });
      setStatus(data.message || "Password reset successful.");
      setStatusTone("success");
    } catch (error) {
      setStatus(error.message);
      setStatusTone("error");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn || resending) return;
    if (!email.trim()) {
      setStatus("Enter your email first.");
      setStatusTone("error");
      return;
    }
    setResending(true);
    setStatus("");
    setStatusTone("neutral");
    try {
      const data = await apiClient("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setStatus(data.message || "If an account exists, a reset code has been sent.");
      setStatusTone("success");
      setResendIn(RESEND_COOLDOWN_SECONDS);
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
        <form onSubmit={submit} noValidate>
          <AuthBrandHeader
            eyebrow="Secure reset"
            title="Create a new password"
            subtitle={email ? "Choose a strong password with uppercase, lowercase, number, and symbol." : "Enter the email where you requested the reset code."}
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
            <div>
              <PremiumInput
                label="Email"
                name="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (status) setStatus("");
                }}
                type="email"
                required
                autoComplete="email"
                placeholder="name@gmail.com"
                error={statusTone === "error" && status === "Email is required." ? status : ""}
              />
              {!email && (
                <p className="mt-1.5 text-xs leading-5 text-[var(--auth-muted)]">
                  Enter the email where you requested the reset code.
                </p>
              )}
            </div>

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

            <div>
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
                error={statusTone === "error" && !confirmPassword ? status : ""}
              />
              <p className="mt-1.5 text-xs leading-5 text-[var(--auth-muted)]">
                Use at least 8 characters with uppercase, lowercase, number and symbol.
              </p>
            </div>

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
              error={statusTone === "error" && confirmPassword && password !== confirmPassword ? status : ""}
            />

            <PrimaryAuthButton type="submit" loading={loading} loadingText="Resetting password...">
              Reset password
            </PrimaryAuthButton>
          </div>

          <AuthStatus
            status={statusTone === "error" && (!status.includes("Password") || password === confirmPassword) ? status : statusTone === "success" ? status : ""}
            tone={statusTone}
          />

          <div className="mt-4">
            <button
              type="button"
              onClick={resend}
              disabled={resending || resendIn > 0}
              className="w-full rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-card-strong)] px-4 py-3 text-sm font-black text-[var(--auth-text)] transition hover:-translate-y-0.5 hover:border-[#F4B400] hover:text-[#F4B400] focus:outline-none focus:ring-2 focus:ring-[#F4B400] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendIn ? `Resend in ${resendIn}s` : resending ? "Sending..." : "Resend reset code"}
            </button>
          </div>

          <TrustIndicators />
        </form>
      </PremiumAuthShell>
    </PremiumAuthPage>
  );
}
