import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GOOGLE_AUTH_ENABLED, GOOGLE_CLIENT_ID } from "../../../config/runtime";
import {
  AuthBrandHeader,
  PremiumAuthPage,
  AuthStatus,
  PremiumAuthShell,
  PremiumInput,
  PremiumPasswordInput,
  PrimaryAuthButton,
  TrustIndicators,
} from "./PremiumAuthUI";
import { Badge, Button, Card } from "../../../components/ui";
import { validateProductionEmail } from "../../../utils/emailValidation";
import { loginWithEmail, loginWithGoogleCredential, registerWithEmail } from "../services/authApi";
import { persistAuthSession } from "../services/authStorage";
import { trackEvent } from "../../../services/analytics";

const GOOGLE_CLIENT_ID_ENV_NAME = "VITE_GOOGLE_CLIENT_ID";
const GOOGLE_BACKEND_ENDPOINT = "/api/auth/google";
let googleInitializedClientId = "";
let googleCredentialHandler = null;

const REGISTER_BENEFITS = [
  "Track your progress",
  "Review your games",
  "Improve faster with AI",
];

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
          text: isLogin ? "continue_with" : "signup_with",
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
    <PremiumAuthShell>
      <AuthBrandHeader title={heading} subtitle={helperText} headingLevel={isModal ? "h2" : "h1"} />

      {referralCode && !isLogin ? (
        <div className="mb-5 rounded-[var(--radius-xl)] border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] p-3 text-sm font-semibold text-[var(--color-success)]">
          Referral code <span className="font-mono">{referralCode}</span> will be connected after registration if valid.
        </div>
      ) : null}

      {!isLogin ? (
        <Card variant="subtle" className="mb-4 grid gap-1.5 p-2.5 sm:mb-6 sm:gap-2 sm:p-3">
          {REGISTER_BENEFITS.map((benefit) => (
            <div key={benefit} className="flex items-center gap-3 text-sm font-bold text-[var(--color-text-primary)]">
              <Badge tone="primary" size="sm">✓</Badge>
              {benefit}
            </div>
          ))}
        </Card>
      ) : null}

      {GOOGLE_AUTH_ENABLED ? (
        <div className="grid gap-2.5 sm:gap-3">
          {/* Google client ID env: {GOOGLE_CLIENT_ID_ENV_NAME}; backend endpoint: {GOOGLE_BACKEND_ENDPOINT} */}
          <div className="relative min-h-11 w-full overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-white sm:min-h-12">
            {!googleReady ? (
              <div className="grid min-h-11 place-items-center px-4 text-sm font-bold text-slate-700 sm:min-h-12">
                Loading Google sign-in...
              </div>
            ) : null}
            <div ref={googleButtonRef} className="w-full" />
            {loading ? <div className="absolute inset-0 cursor-wait rounded-[var(--radius-xl)] bg-white/60" /> : null}
          </div>

          <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
            <span className="h-px flex-1 bg-[var(--color-border-primary)]" />
            or continue with email
            <span className="h-px flex-1 bg-[var(--color-border-primary)]" />
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
            <p className="mt-1.5 text-xs leading-5 text-[var(--color-text-tertiary)]">3-16 letters or numbers only.</p>
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
              <p className="mt-1.5 text-xs leading-5 text-[var(--color-text-tertiary)]">
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

          <PrimaryAuthButton
            type="submit"
            loading={loading}
            loadingText={isLogin ? "Signing in..." : "Creating account..."}
          >
            {isLogin ? "Sign In" : "Create Account"}
          </PrimaryAuthButton>

          {isLogin ? (
            <Button
              type="button"
              onClick={() => navigateToForgotPassword(onNavigatePath)}
              disabled={loading}
              variant="ghost"
              className="w-full"
            >
              Forgot password?
            </Button>
          ) : null}
      </form>

      <AuthStatus status={error} tone="error" />
      <AuthStatus status={success} tone="success" />

      <TrustIndicators>
        <button
          type="button"
          onClick={handleToggleMode}
          disabled={loading}
          className="ds-focus rounded-[var(--radius-md)] text-sm font-black text-[var(--color-text-primary)] underline-offset-4 transition hover:text-[var(--color-primary)] hover:underline disabled:opacity-60"
        >
          {isLogin ? "New to ChessPlay? Create Account" : "Already have an account? Sign In"}
        </button>
      </TrustIndicators>
    </PremiumAuthShell>
  );

  if (isModal) return formContent;

  return (
    <PremiumAuthPage>
      {formContent}
    </PremiumAuthPage>
  );
}
