import { apiClient } from "../../../services/apiClient";

function normalizeAuthError(error, fallback) {
  if (error?.status === 429) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (error?.status === 0) {
    return "Network error. Please check your connection and try again.";
  }
  return error?.message || fallback;
}

export async function loginWithEmail({ email, password }) {
  try {
    return await apiClient("/api/auth/login", {
      method: "POST",
      skipAuthRefresh: true,
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    throw new Error(normalizeAuthError(error, "Unable to sign in. Please try again."));
  }
}

export async function registerWithEmail({ username, email, password, referralCode }) {
  try {
    return await apiClient("/api/auth/register", {
      method: "POST",
      skipAuthRefresh: true,
      body: JSON.stringify({ username, email, password, referralCode }),
    });
  } catch (error) {
    throw new Error(normalizeAuthError(error, "Unable to create account. Please try again."));
  }
}

export async function loginWithGoogleCredential(credential) {
  try {
    return await apiClient("/api/auth/google", {
      method: "POST",
      skipAuthRefresh: true,
      body: JSON.stringify({ credential }),
    });
  } catch (error) {
    throw new Error(normalizeAuthError(error, "Google login failed. Please try again or use email login."));
  }
}
