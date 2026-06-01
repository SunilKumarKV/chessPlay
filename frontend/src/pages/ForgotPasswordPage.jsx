import { useState } from "react";
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
import { validateProductionEmail } from "../utils/emailValidation";

export default function ForgotPasswordPage({ onBack, onResetRequested }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("neutral");
  const [requestedEmail, setRequestedEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
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
      const data = await apiClient("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setStatus(data.message);
      setStatusTone("success");
      setRequestedEmail(email.trim().toLowerCase());
    } catch (error) {
      setStatus(error.message);
      setStatusTone("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumAuthPage>
      <PremiumAuthShell>
        <form onSubmit={submit} noValidate>
          <AuthBrandHeader
            eyebrow="Account recovery"
            title="Reset your password"
            subtitle="Enter your verified email and we’ll send a secure 6-digit reset code."
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
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status) setStatus("");
              }}
              type="email"
              required
              autoComplete="email"
              placeholder="name@gmail.com"
              error={statusTone === "error" ? status : ""}
            />

            <PrimaryAuthButton type="submit" loading={loading} loadingText="Sending reset link...">
              Send reset code
            </PrimaryAuthButton>
          </div>

          <AuthStatus status={statusTone === "error" ? "" : status} tone={statusTone} />
          {requestedEmail ? (
            <button
              type="button"
              onClick={() => onResetRequested?.(requestedEmail)}
              className="mt-4 w-full rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-card-strong)] px-4 py-3 text-sm font-black text-[var(--auth-text)] transition hover:-translate-y-0.5 hover:border-[#F4B400] hover:text-[#F4B400] focus:outline-none focus:ring-2 focus:ring-[#F4B400]"
            >
              Enter reset code
            </button>
          ) : null}
          <TrustIndicators />
        </form>
      </PremiumAuthShell>
    </PremiumAuthPage>
  );
}
