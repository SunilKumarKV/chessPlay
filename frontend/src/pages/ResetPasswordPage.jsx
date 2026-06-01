import { useState } from "react";
import { apiClient } from "../services/apiClient";
import { PasswordInput } from "../components/ui/FormInputs";

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
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setStatus("");

    if (!token) {
      setStatus("Reset token is missing. Please request a fresh link.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setStatus(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setStatus(data.message || "Password reset successful.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0f14] px-6 py-10 text-white">
      <form
        onSubmit={submit}
        className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30"
      >
        <button
          type="button"
          onClick={onBack}
          className="mb-6 rounded-lg border border-white/10 px-4 py-2 text-sm"
        >
          Back
        </button>
        <h1 className="mb-2 text-2xl font-black">Reset password</h1>
        <p className="mb-5 text-sm text-slate-400">
          Choose a new password with at least 8 characters, including a lowercase letter, uppercase letter, number, and symbol.
        </p>
        <PasswordInput
          label="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="New password"
          error={status && !confirmPassword ? status : ""}
        />
        <PasswordInput
          label="Confirm password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Confirm password"
          error={status && confirmPassword && password !== confirmPassword ? status : ""}
        />
        <button
          disabled={loading}
          className="w-full rounded-lg bg-[#81b64c] px-4 py-3 font-bold text-black disabled:opacity-60"
        >
          {loading ? "Resetting..." : "Reset password"}
        </button>
        {status && <p role="status" className="mt-4 text-sm text-slate-300">{status}</p>}
      </form>
    </main>
  );
}
