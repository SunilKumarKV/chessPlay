import { useState } from "react";
import { FormInput, PasswordInput, PrimaryBtn } from "../../../components/ui";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const GOOGLE_AUTH_URL = import.meta.env.VITE_GOOGLE_AUTH_URL || "";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const FACEBOOK_AUTH_URL = import.meta.env.VITE_FACEBOOK_AUTH_URL || "";

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
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

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      if (GOOGLE_AUTH_URL) {
        window.location.href = GOOGLE_AUTH_URL;
        return;
      }

      if (!GOOGLE_CLIENT_ID) {
        throw new Error("Google login needs VITE_GOOGLE_CLIENT_ID.");
      }

      const google = await loadGoogleIdentityScript();
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
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
            onLogin(data.user);
          } catch (error) {
            setError(error.message);
          } finally {
            setLoading(false);
          }
        },
      });
      google.accounts.id.prompt((notification) => {
        if (
          notification.isNotDisplayed() ||
          notification.isSkippedMoment() ||
          notification.isDismissedMoment()
        ) {
          setLoading(false);
          setError("Google login popup was closed or blocked.");
        }
      });
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    if (provider === "google") {
      handleGoogleLogin();
      return;
    }

    if (FACEBOOK_AUTH_URL) {
      window.location.href = FACEBOOK_AUTH_URL;
      return;
    }

    setError("Facebook login needs OAuth client configuration before it can be used.");
  };

  const formContent = (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-[#c9a45c] text-2xl text-[#171512]">
          ♟
        </div>
        <h2 className="text-2xl font-semibold">
          {isLogin ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Login security is required for multiplayer, friends, messages, and game history.
        </p>
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-100"
        >
          <span className="text-base font-bold">G</span>
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => handleSocialLogin("facebook")}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1877f2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#166fe5]"
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
          className="w-full rounded-lg border border-[#c9a45c]/40 bg-[#c9a45c]/10 px-4 py-2.5 text-sm font-semibold text-[#f5d78e] hover:bg-[#c9a45c]/20"
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
            placeholder="name@example.com"
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
        <div className="text-red-300 text-sm text-center bg-red-900/20 border border-red-800 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="mt-6 text-center">
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
