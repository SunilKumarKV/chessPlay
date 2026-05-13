import { useCallback, useEffect, useRef, useState } from "react";
import { FormInput, PasswordInput, PrimaryBtn } from "../../../components/ui";
import {
  BACKEND_URL,
  FACEBOOK_AUTH_URL,
  GOOGLE_AUTH_URL,
  GOOGLE_CLIENT_ID,
} from "../../../config/runtime";
import { validateProductionEmail } from "../../../utils/emailValidation";

let googleInitializedClientId = "";
let googleCredentialHandler = null;

function loadGoogleIdentityScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google), {
        once: true,
      });
      existingScript.addEventListener("error", reject, { once: true });
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

export default function Auth({
  onLogin,
  isModal = false,
  initialIsLogin = true,
  onToggleMode,
}) {
  const [isLogin, setIsLogin] = useState(() => initialIsLogin);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const googleButtonRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const emailError = validateProductionEmail(formData.email);
      if (emailError) throw new Error(emailError);

      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      localStorage.removeItem("token");
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.socketToken) sessionStorage.setItem("chessplay_socket_token", data.socketToken);

      onLogin(data.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleToggleMode = () => {
    if (onToggleMode) {
      onToggleMode();
    } else {
      setIsLogin(!isLogin);
      setError("");
      setFormData({ username: "", email: "", password: "" });
    }
  };

  const handleGoogleCredential = useCallback(
    async ({ credential }) => {
      setError("");
      setLoading(true);

      try {
        if (!credential) {
          throw new Error("Google did not return a credential");
        }

        const response = await fetch(`${BACKEND_URL}/api/auth/google`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ credential }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Google login failed");
        }

        localStorage.removeItem("token");
        localStorage.setItem("user", JSON.stringify(data.user));
      if (data.socketToken) sessionStorage.setItem("chessplay_socket_token", data.socketToken);
        onLogin(data.user);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    },
    [onLogin],
  );

  useEffect(() => {
    googleCredentialHandler = handleGoogleCredential;

    if (!GOOGLE_CLIENT_ID || GOOGLE_AUTH_URL || !googleButtonRef.current) {
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
            callback: (response) => {
              googleCredentialHandler?.(response);
            },
          });
          googleInitializedClientId = GOOGLE_CLIENT_ID;
        }

        googleButtonRef.current.innerHTML = "";
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          text: "continue_with",
          shape: "rectangular",
          width: googleButtonRef.current.offsetWidth || 360,
        });
      } catch (error) {
        if (!cancelled) setError(error.message);
      }
    }

    renderGoogleButton();

    return () => {
      cancelled = true;
      googleCredentialHandler = null;
    };
  }, [handleGoogleCredential]);

  const handleGoogleRedirect = () => {
    try {
      if (GOOGLE_AUTH_URL) {
        window.location.href = GOOGLE_AUTH_URL;
        return;
      }

      if (!GOOGLE_CLIENT_ID) {
        throw new Error("Google login needs VITE_GOOGLE_CLIENT_ID.");
      }

      setError("Use the Google button above to continue.");
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSocialLogin = (provider) => {
    if (provider === "google") {
      handleGoogleRedirect();
      return;
    }

    if (FACEBOOK_AUTH_URL) {
      window.location.href = FACEBOOK_AUTH_URL;
      return;
    }

    setError("Facebook login needs OAuth client configuration before it can be used.");
  };

  const formContent = (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl space-y-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#81b64c]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="relative text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[#81b64c] text-3xl text-[#07100a] shadow-lg shadow-[#81b64c]/20">
          ♟
        </div>
        <div className="mb-2 inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Premium secure access</div>
        <h2 className="text-2xl font-black text-white">
          {isLogin ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Login security is required for multiplayer, friends, messages, game history and supporter features.
        </p>
      </div>

      <div className="relative grid gap-2">
        {GOOGLE_CLIENT_ID && !GOOGLE_AUTH_URL ? (
          <div className="min-h-11 w-full overflow-hidden rounded-lg bg-white">
            <div ref={googleButtonRef} className="w-full" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => handleSocialLogin("google")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-black text-gray-900 hover:bg-gray-100"
          >
            <span className="text-base font-bold">G</span>
            Continue with Google
          </button>
        )}
        <button
          type="button"
          onClick={() => handleSocialLogin("facebook")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877f2] px-4 py-3 text-sm font-black text-white hover:bg-[#166fe5]"
        >
          <span className="text-base font-bold">f</span>
          Continue with Facebook
        </button>
        <button
          type="button"
          onClick={() => {
            setShowEmailForm((value) => !value);
            setError("");
          }}
          className="w-full rounded-xl border border-[#81b64c]/40 bg-[#81b64c]/10 px-4 py-3 text-sm font-black text-[#a8e36f] hover:bg-[#81b64c]/20"
        >
          Continue with email
        </button>
      </div>

      {showEmailForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <FormInput
              label="Username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required={!isLogin}
              minLength={3}
              placeholder="Choose a username"
            />
          )}

          <FormInput
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="name@gmail.com"
          />

          <PasswordInput
            label="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
            placeholder="At least 8 characters"
          />

          <PrimaryBtn
            type="submit"
            disabled={loading}
            className={`w-full ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
          </PrimaryBtn>
        </form>
      )}

      {error && (
        <div className="relative text-red-300 text-sm text-center bg-red-900/20 border border-red-800 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="relative mt-6 text-center">
        <button
          onClick={handleToggleMode}
          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          {isLogin
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );

  if (isModal) {
    return formContent;
  }

  return (
    <div className="min-h-screen bg-[#171512] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#f5d78e] mb-2">ChessPlay</h1>
          <p className="text-gray-400">Secure sign-in for your chess arena</p>
        </div>

        {/* Auth Form */}
        <div className="bg-[#24211d] rounded-xl p-6 border border-[#c9a45c]/20 shadow-2xl">
          {formContent}
        </div>
      </div>
    </div>
  );
}
