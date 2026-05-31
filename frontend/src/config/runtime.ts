const configuredApiUrl =
  import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;

if (import.meta.env.PROD && !configuredApiUrl) {
  throw new Error("VITE_BACKEND_URL is required for production builds.");
}

export const BACKEND_URL = configuredApiUrl || "http://localhost:3001";

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || BACKEND_URL;

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export const GOOGLE_AUTH_ENABLED =
  Boolean(GOOGLE_CLIENT_ID) && import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true";

export const GOOGLE_AUTH_URL =
  import.meta.env.VITE_GOOGLE_AUTH_URL || "";

export const FACEBOOK_AUTH_URL =
  import.meta.env.VITE_FACEBOOK_AUTH_URL || "";

export const SENTRY_DSN =
  import.meta.env.VITE_SENTRY_DSN || "";
