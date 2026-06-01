import { useState } from "react";
import { BrandLogo } from "../../../components/brand/BrandLogo";

const AUTH_TRUST_ITEMS = ["Secure authentication", "Privacy-first", "Free to start"];

function getAuthThemeVars() {
  const isLight = document.documentElement.dataset.theme === "light";
  if (isLight) {
    return {
      "--auth-card": "rgba(255,255,255,0.9)",
      "--auth-card-strong": "rgba(255,255,255,0.98)",
      "--auth-text": "#0B1220",
      "--auth-muted": "#526072",
      "--auth-border": "rgba(15,23,42,0.12)",
      "--auth-input": "rgba(248,250,252,0.92)",
      "--auth-shadow": "rgba(15,23,42,0.18)",
      "--auth-glow": "rgba(244,180,0,0.22)",
    };
  }

  return {
    "--auth-card": "rgba(11,15,25,0.84)",
    "--auth-card-strong": "rgba(17,24,39,0.82)",
    "--auth-text": "#F8FAFC",
    "--auth-muted": "#AAB3C2",
    "--auth-border": "rgba(255,255,255,0.13)",
    "--auth-input": "rgba(15,23,42,0.86)",
    "--auth-shadow": "rgba(0,0,0,0.42)",
    "--auth-glow": "rgba(244,180,0,0.24)",
  };
}

export function PremiumAuthShell({ children, className = "" }) {
  return (
    <div
      className={`relative mx-auto w-full max-w-[560px] overflow-hidden rounded-[28px] border border-[var(--auth-border)] bg-[var(--auth-card)] p-4 text-[var(--auth-text)] shadow-[0_30px_120px_var(--auth-shadow)] backdrop-blur-2xl sm:p-8 ${className}`}
      style={getAuthThemeVars()}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#F4B400]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#4F46E5]/20 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function PremiumAuthPage({ children }) {
  const isLight = document.documentElement.dataset.theme === "light";

  return (
    <main
      className="flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 text-white sm:px-6 sm:py-10"
      style={{
        background: isLight
          ? "radial-gradient(circle at 20% 10%, rgba(244,180,0,0.18), transparent 30%), radial-gradient(circle at 80% 0%, rgba(79,70,229,0.12), transparent 28%), #F7FAFC"
          : "radial-gradient(circle at 20% 10%, rgba(244,180,0,0.14), transparent 30%), radial-gradient(circle at 80% 0%, rgba(79,70,229,0.18), transparent 28%), #0B0F19",
      }}
    >
      <div className="w-full max-w-[560px]">{children}</div>
    </main>
  );
}

export function AuthBrandHeader({ eyebrow = "Secure access", title, subtitle, headingLevel = "h1" }) {
  const Heading = headingLevel;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4 sm:mb-7">
        <BrandLogo className="h-9 w-32 text-[var(--auth-text)] sm:h-11 sm:w-40" />
        <span className="rounded-full border border-[var(--auth-border)] bg-[var(--auth-card-strong)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#F4B400] shadow-sm">
          {eyebrow}
        </span>
      </div>
      <div className="mb-4 sm:mb-6">
        <Heading className="font-['Montserrat'] text-2xl font-black tracking-tight text-[var(--auth-text)] sm:text-4xl">{title}</Heading>
        <p className="mt-1.5 text-sm leading-6 text-[var(--auth-muted)] sm:text-base sm:leading-7">{subtitle}</p>
      </div>
    </>
  );
}

export function PremiumInput({ label, error, className = "", ...props }) {
  const inputId = props.id || props.name;
  const describedBy = error ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-bold text-[var(--auth-text)]">
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={`h-11 w-full rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-input)] px-4 text-[var(--auth-text)] outline-none transition duration-200 placeholder:text-[var(--auth-muted)]/70 focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244,180,0,0.16)] sm:h-12 ${className}`}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-sm font-semibold text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PremiumPasswordInput({ label, error, className = "", ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = props.id || props.name;
  const describedBy = error ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-bold text-[var(--auth-text)]">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={showPassword ? "text" : "password"}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={`h-11 w-full rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-input)] px-4 pr-20 text-[var(--auth-text)] outline-none transition duration-200 placeholder:text-[var(--auth-muted)]/70 focus:border-[#F4B400] focus:shadow-[0_0_0_4px_rgba(244,180,0,0.16)] sm:h-12 ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-black text-[var(--auth-muted)] transition hover:bg-[#F4B400]/10 hover:text-[#F4B400] focus:outline-none focus:ring-2 focus:ring-[#F4B400]"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-sm font-semibold text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PrimaryAuthButton({ loading, children, loadingText, className = "", ...props }) {
  return (
    <button
      className={`group flex h-11 w-full items-center justify-center gap-3 rounded-2xl bg-[#F4B400] px-4 font-black text-[#0B0F19] shadow-[0_18px_46px_var(--auth-glow)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-65 sm:h-12 ${className}`}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B0F19]/25 border-t-[#0B0F19]" aria-hidden="true" />
      ) : null}
      {loading ? loadingText : children}
    </button>
  );
}

export function AuthStatus({ status, tone = "neutral" }) {
  if (!status) return null;
  const toneClass = tone === "success"
    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
    : tone === "error"
      ? "border-red-400/25 bg-red-500/10 text-red-300"
      : "border-[var(--auth-border)] bg-[var(--auth-card-strong)] text-[var(--auth-muted)]";

  return (
    <div role={tone === "error" ? "alert" : "status"} className={`mt-4 rounded-2xl border p-3 text-sm font-semibold ${toneClass}`}>
      {status}
    </div>
  );
}

export function TrustIndicators({ children }) {
  return (
    <div className="mt-4 rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-card-strong)] p-2.5 sm:mt-6 sm:p-3">
      <div className="flex flex-wrap justify-center gap-2 text-xs font-black text-[var(--auth-muted)]">
        {AUTH_TRUST_ITEMS.map((item) => (
          <span key={item} className="rounded-full border border-[var(--auth-border)] px-3 py-1">
            {item}
          </span>
        ))}
      </div>
      {children ? <div className="mt-4 text-center">{children}</div> : null}
    </div>
  );
}
