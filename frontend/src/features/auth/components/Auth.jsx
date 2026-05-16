import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormInput, PasswordInput, PrimaryBtn } from "../../../components/ui";
import { GOOGLE_CLIENT_ID } from "../../../config/runtime";

const GOOGLE_CLIENT_ID_ENV_NAME = "VITE_GOOGLE_CLIENT_ID";
const GOOGLE_BACKEND_ENDPOINT = "/api/auth/google";
import { validateProductionEmail } from "../../../utils/emailValidation";
import { loginWithEmail, loginWithGoogleCredential, registerWithEmail } from "../services/authApi";
import { persistAuthSession } from "../services/authStorage";
import { trackEvent } from "../../../services/analytics";

let googleInitializedClientId = "";
let googleCredentialHandler = null;

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

  const heading = isLogin ? "Sign in to ChessPlay" : "Create your ChessPlay account";
  const helperText = isLogin
    ? "Access multiplayer, friends, messages, game history, and supporter features securely."
    : "Start free with secure account protection for your chess progress.";

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

    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) {
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
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#81b64c]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />

      {referralCode && !isLogin && (
        <div className="relative mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">
          You were invited to ChessPlay. Referral code <span className="font-mono text-emerald-200">{referralCode}</span> will be connected after registration if it is valid.
        </div>
      )}

      <div className="relative text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[#81b64c] text-3xl text-[#07100a] shadow-lg shadow-[#81b64c]/20">
          ♟
        </div>
        <div className="mb-2 inline-flex rounded-full border border-[#81b64c]/25 bg-[#81b64c]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#a8e36f]">
          Secure access
        </div>
        <h2 className="text-2xl font-black text-white sm:text-3xl">{heading}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{helperText}</p>
      </div>

      <div className="relative mt-5 grid gap-3">
        {/* Google client ID env: {GOOGLE_CLIENT_ID_ENV_NAME}; backend endpoint: {GOOGLE_BACKEND_ENDPOINT} */}
        {GOOGLE_CLIENT_ID ? (
          <div className="relative min-h-11 w-full overflow-hidden rounded-full bg-white">
            {!googleReady && (
              <div className="grid min-h-11 place-items-center px-4 text-sm font-bold text-slate-700">
                Loading Google sign-in...
              </div>
            )}
            <div ref={googleButtonRef} className="w-full" />
            {loading && <div className="absolute inset-0 cursor-wait rounded-full bg-white/60" />}
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-center text-sm text-amber-100">
            Google login is not configured. Use email login.
          </div>
        )}

        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          <span className="h-px flex-1 bg-white/10" />
          or use email
          <span className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative mt-5 space-y-4" noValidate>
        {!isLogin && (
          <div>
            <FormInput
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
            <p className="mt-1 text-xs text-slate-500">3–16 letters or numbers only.</p>
          </div>
        )}

        <FormInput
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
          <PasswordInput
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
          {!isLogin && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Use at least 8 characters with uppercase, lowercase, number and symbol.
            </p>
          )}
        </div>

        {!isLogin && (
          <PasswordInput
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
        )}

        <PrimaryBtn
          type="submit"
          disabled={loading}
          className={`w-full ${loading ? "cursor-not-allowed opacity-60" : ""}`}
        >
          {loading ? (isLogin ? "Signing in..." : "Creating account...") : isLogin ? "Sign in" : "Create account"}
        </PrimaryBtn>

        {isLogin && (
          <button
            type="button"
            onClick={() => navigateToForgotPassword(onNavigatePath)}
            disabled={loading}
            className="w-full text-center text-sm font-bold text-[#a8e36f] transition hover:text-[#c5f29c] disabled:opacity-60"
          >
            Forgot password?
          </button>
        )}
      </form>

      {error && (
        <div role="alert" className="relative mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-center text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="relative mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-center text-sm text-emerald-200">
          {success}
        </div>
      )}

      <div className="relative mt-6 text-center">
        <button
          type="button"
          onClick={handleToggleMode}
          disabled={loading}
          className="text-sm font-bold text-blue-300 transition-colors hover:text-blue-200 disabled:opacity-60"
        >
          {isLogin ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );

  if (isModal) return formContent;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#171512] p-4 text-white sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold text-[#f5d78e]">ChessPlay</h1>
          <p className="text-gray-400">Secure sign-in for your chess arena</p>
        </div>
        {formContent}
      </div>
    </main>
  );
}
