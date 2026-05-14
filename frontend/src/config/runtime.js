const DEFAULT_PRODUCTION_BACKEND_URL = "https://chessplay-b5ve.onrender.com";

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.PROD ? DEFAULT_PRODUCTION_BACKEND_URL : "http://localhost:3001");

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || BACKEND_URL;

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Google sign-in uses Google Identity Services on the frontend and POSTs the returned credential to /api/auth/google.
// Do not configure a VITE_GOOGLE_AUTH_URL redirect for this backend.
export const FACEBOOK_AUTH_URL =
  import.meta.env.VITE_FACEBOOK_AUTH_URL || "";

export const SENTRY_DSN =
  import.meta.env.VITE_SENTRY_DSN || "";
