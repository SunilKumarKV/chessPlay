import { SENTRY_DSN } from "../config/runtime";

export async function initMonitoring() {
  if (!SENTRY_DSN) return;
  if (window.Sentry?.init) window.Sentry.init({ dsn: SENTRY_DSN });
  else if (import.meta.env.DEV) console.warn("Sentry DSN configured, but Sentry browser SDK is not loaded.");
}
