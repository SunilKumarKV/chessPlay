import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "../../../components/brand/BrandLogo";
import { GOOGLE_AUTH_ENABLED, GOOGLE_CLIENT_ID } from "../../../config/runtime";

const GOOGLE_CLIENT_ID_ENV_NAME = "VITE_GOOGLE_CLIENT_ID";
const GOOGLE_BACKEND_ENDPOINT = "/api/auth/google";
import { validateProductionEmail } from "../../../utils/emailValidation";
import { loginWithEmail, loginWithGoogleCredential, registerWithEmail } from "../services/authApi";
import { persistAuthSession } from "../services/authStorage";
import { trackEvent } from "../../../services/analytics";

let googleInitializedClientId = "";
let googleCredentialHandler = null;

const REGISTER_BENEFITS = [
  "Track your progress",
  "Review your games",
  "Improve faster with AI",
];

const TRUST_ITEMS = ["Secure authentication", "Privacy-first", "Free to start"];

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

function loadGoogleIdentityScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Google login")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Unable to load Google login"));
    document.head.appendChild(script);
  });
}

function validateUsername(username) {
  const value = username.trim();
  if (value.length < 3 || value.length > 16) return "Username must be 3–16 characters.";
  if (!/^[a-zA-Z0-9]+$/.test(value)) return "Username can use letters and numbers only.";
  return "";
}

function validatePassword(password) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/\d/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a symbol.";
  return "";
}

function navigateToForgotPassword(onNavigatePath) {
  if (typeof onNavigatePath === "function") {
    onNavigatePath("/forgot-password");
  }
}

function PremiumInput({ label, error, className = "", ...props }) {
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

function PremiumPasswordInput({ label, error, className = "", ...props }) {
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

export default function Auth({
  onLogin,
  isModal = false,
  initialIsLogin = true,
  onToggleMode,
  onNavigatePath,
}) {
  const [isLogin, setIsLogin] = useState(() => initialIsLogin);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const googleButtonRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = String(params.get("ref") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
    setReferralCode(ref);
    if (ref) setIsLogin(false);
  }, []);

  useEffect(() => {
    setIsLogin(referralCode ? false : initialIsLogin);
    setError("");
    setSuccess("");
    setFormData({ username: "", email: "", password: "", confirmPassword: "" });
  }, [initialIsLogin, referralCode]);

  const heading = isLogin ? "Welcome back" : "Create your ChessPlay account";
  const helperText = isLogin
    ? "Continue improving your chess."
    : "Play chess, analyze mistakes, and improve faster.";

  const formErrors = useMemo(() => {
    const errors = {};
    const emailError = formData.email ? validateProductionEmail(formData.email) : "";
    if (emailError) errors.email = emailError;
    if (!isLogin && formData.username) {
      const usernameError = validateUsername(formData.username);
      if (usernameError) errors.username = usernameError;
    }
    if (!isLogin && formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) errors.password = passwordError;
    }
    if (!isLogin && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    return errors;
  }, [formData, isLogin]);

  const validateBeforeSubmit = () => {
    const emailError = validateProductionEmail(formData.email);
    if (emailError) throw new Error(emailError);
    if (!formData.password) throw new Error("Password is required.");

    if (!isLogin) {
      const usernameError = validateUsername(formData.username);
      if (usernameError) throw new Error(usernameError);

      const passwordError = validatePassword(formData.password);
      if (passwordError) throw new Error(passwordError);

      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match.");
      }
    }
  };

  const completeLogin = useCallback((data, message) => {
    persistAuthSession(data);
    setSuccess(message);
    window.setTimeout(() => onLogin(data.user), 250);
  }, [onLogin]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    try {
      validateBeforeSubmit();
      setLoading(true);

      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      const data = isLogin
        ? await loginWithEmail(payload)
        : await registerWithEmail({ ...payload, username: formData.username.trim(), referralCode });

      trackEvent(isLogin ? "login" : "signup", { method: "email" });
      completeLogin(data, isLogin ? "Welcome back." : data?.referralConnected ? "Account created successfully. Referral connected." : "Account created successfully.");
    } catch (authError) {
      setError(authError.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleToggleMode = () => {
    setError("");
    setSuccess("");
    setFormData({ username: "", email: "", password: "", confirmPassword: "" });
    if (onToggleMode) {
      onToggleMode();
    } else {
      setIsLogin((value) => !value);
    }
  };

  const handleGoogleCredential = useCallback(
    async ({ credential }) => {
      if (loading) return;
      setError("");
      setSuccess("");
      setLoading(true);

      try {
        if (!credential) throw new Error("Google did not return a credential. Please try again.");
        const data = await loginWithGoogleCredential(credential);
        trackEvent("login", { method: "google" });
        completeLogin(data, "Welcome back.");
      } catch (authError) {
        setError(authError.message || "Google login failed. Please use email login.");
      } finally {
        setLoading(false);
      }
    },
    [completeLogin, loading],
  );

  useEffect(() => {
    googleCredentialHandler = handleGoogleCredential;

    if (!GOOGLE_AUTH_ENABLED || !GOOGLE_CLIENT_ID || !googleButtonRef.current) {
      setGoogleReady(false);
      return () => {
        googleCredentialHandler = null;
      };
    }

    let cancelled = false;

    async function renderGoogleButton() {
      try {
        const google = await loadGoogleIdentityScript();
        if (cancelled || !googleButtonRef.current) return;

        if (googleInitializedClientId !== GOOGLE_CLIENT_ID) {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => googleCredentialHandler?.(response),
            ux_mode: "popup",
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          googleInitializedClientId = GOOGLE_CLIENT_ID;
        }

        googleButtonRef.current.innerHTML = "";
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          text: isLogin ? "signin_with" : "signup_with",
          shape: "pill",
          width: Math.min(googleButtonRef.current.offsetWidth || 360, 390),
        });
        setGoogleReady(true);
      } catch (googleError) {
        if (!cancelled) {
          setGoogleReady(false);
          setError(googleError.message || "Google login is not available. Please use email login.");
        }
      }
    }

    renderGoogleButton();

    return () => {
      cancelled = true;
      googleCredentialHandler = null;
    };
  }, [handleGoogleCredential, isLogin]);

  const formContent = (
    <div
      className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-[28px] border border-[var(--auth-border)] bg-[var(--auth-card)] p-4 text-[var(--auth-text)] shadow-[0_30px_120px_var(--auth-shadow)] backdrop-blur-2xl sm:p-8"
      style={getAuthThemeVars()}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#F4B400]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#4F46E5]/20 blur-3xl" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-4 sm:mb-7">
          <BrandLogo className="h-9 w-32 text-[var(--auth-text)] sm:h-11 sm:w-40" />
          <span className="rounded-full border border-[var(--auth-border)] bg-[var(--auth-card-strong)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#F4B400] shadow-sm">
            Secure access
          </span>
        </div>

        {referralCode && !isLogin ? (
          <div className="mb-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-300">
            Referral code <span className="font-mono">{referralCode}</span> will be connected after registration if valid.
          </div>
        ) : null}

        <div className="mb-4 sm:mb-6">
          <h2 className="font-['Montserrat'] text-2xl font-black tracking-tight text-[var(--auth-text)] sm:text-4xl">{heading}</h2>
          <p className="mt-1.5 text-sm leading-6 text-[var(--auth-muted)] sm:text-base sm:leading-7">{helperText}</p>
        </div>

        {!isLogin ? (
          <div className="mb-4 grid gap-1.5 rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-card-strong)] p-2.5 sm:mb-6 sm:gap-2 sm:p-3">
            {REGISTER_BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 text-sm font-bold text-[var(--auth-text)]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#F4B400]/15 text-[#B77900]">✓</span>
                {benefit}
              </div>
            ))}
          </div>
        ) : null}

        {GOOGLE_AUTH_ENABLED ? (
        <div className="grid gap-2.5 sm:gap-3">
          {/* Google client ID env: {GOOGLE_CLIENT_ID_ENV_NAME}; backend endpoint: {GOOGLE_BACKEND_ENDPOINT} */}
          <div className="relative min-h-11 w-full overflow-hidden rounded-2xl border border-[var(--auth-border)] bg-white sm:min-h-12">
            {!googleReady ? (
              <div className="grid min-h-11 place-items-center px-4 text-sm font-bold text-slate-700 sm:min-h-12">
                Loading Google sign-in...
              </div>
            ) : null}
            <div ref={googleButtonRef} className="w-full" />
            {loading ? <div className="absolute inset-0 cursor-wait rounded-2xl bg-white/60" /> : null}
          </div>

          <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-[var(--auth-muted)]">
            <span className="h-px flex-1 bg-[var(--auth-border)]" />
            or use email
            <span className="h-px flex-1 bg-[var(--auth-border)]" />
          </div>
        </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 sm:mt-5 sm:space-y-4" noValidate>
          {!isLogin ? (
            <div>
              <PremiumInput
                label="Username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                minLength={3}
                maxLength={16}
                autoComplete="username"
                placeholder="sunilchess"
                error={formErrors.username}
              />
              <p className="mt-1.5 text-xs leading-5 text-[var(--auth-muted)]">3-16 letters or numbers only.</p>
            </div>
          ) : null}

          <PremiumInput
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            placeholder="name@gmail.com"
            error={formErrors.email}
          />

          <div>
            <PremiumPasswordInput
              label="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={isLogin ? "Enter your password" : "Create a strong password"}
              error={formErrors.password}
            />
            {!isLogin ? (
              <p className="mt-1.5 text-xs leading-5 text-[var(--auth-muted)]">
                Use at least 8 characters with uppercase, lowercase, number and symbol.
              </p>
            ) : null}
          </div>

          {!isLogin ? (
            <PremiumPasswordInput
              label="Confirm password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              error={formErrors.confirmPassword}
            />
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="group flex h-11 w-full items-center justify-center gap-3 rounded-2xl bg-[#F4B400] px-4 font-black text-[#0B0F19] shadow-[0_18px_46px_var(--auth-glow)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#F4B400] focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-65 sm:h-12"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B0F19]/25 border-t-[#0B0F19]" aria-hidden="true" />
            ) : null}
            {loading ? (isLogin ? "Signing in..." : "Creating account...") : isLogin ? "Sign In" : "Create Account"}
          </button>

          {isLogin ? (
            <button
              type="button"
              onClick={() => navigateToForgotPassword(onNavigatePath)}
              disabled={loading}
              className="w-full rounded-xl py-1 text-center text-sm font-bold text-[#B77900] transition hover:text-[#F4B400] focus:outline-none focus:ring-2 focus:ring-[#F4B400] disabled:opacity-60"
            >
              Forgot password?
            </button>
          ) : null}
        </form>

        {error ? (
          <div role="alert" className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
            {error}
          </div>
        ) : null}

        {success ? (
          <div role="status" className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">
            {success}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-card-strong)] p-2.5 sm:mt-6 sm:p-3">
          <div className="flex flex-wrap justify-center gap-2 text-xs font-black text-[var(--auth-muted)]">
            {TRUST_ITEMS.map((item) => (
              <span key={item} className="rounded-full border border-[var(--auth-border)] px-3 py-1">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleToggleMode}
              disabled={loading}
              className="text-sm font-black text-[var(--auth-text)] underline-offset-4 transition hover:text-[#F4B400] hover:underline focus:outline-none focus:ring-2 focus:ring-[#F4B400] disabled:opacity-60"
            >
              {isLogin ? "New to ChessPlay? Create Account" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) return formContent;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F19] p-4 text-white sm:p-6">
      <div className="w-full max-w-[560px]">
        {formContent}
      </div>
    </main>
  );
}
