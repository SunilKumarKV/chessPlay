import { useState } from "react";
import { FormInput, PasswordInput, PrimaryBtn } from "../../../components/ui";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const GOOGLE_AUTH_URL = import.meta.env.VITE_GOOGLE_AUTH_URL || "";
const FACEBOOK_AUTH_URL = import.meta.env.VITE_FACEBOOK_AUTH_URL || "";

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

  const handleSocialLogin = (provider) => {
    const url = provider === "google" ? GOOGLE_AUTH_URL : FACEBOOK_AUTH_URL;
    if (url) {
      window.location.href = url;
      return;
    }

    setError(
      `${provider === "google" ? "Google" : "Facebook"} login needs OAuth client configuration before it can be used.`,
    );
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
