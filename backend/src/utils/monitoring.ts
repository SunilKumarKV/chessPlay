// @ts-nocheck
import logger from "./safeLogger";

let sentry = null;

function initMonitoring() {
  if (!process.env.SENTRY_DSN) return;
  try {
    logger.warn("Sentry DSN configured, but @sentry/node is not bundled in this backend build. Continuing without monitoring.");
  } catch {
    logger.warn("Sentry DSN configured, but @sentry/node is not installed. Continuing without monitoring.");
  }
}

function captureException(error, context = {}) {
  if (sentry) sentry.captureException(error, { extra: context });
}

export { captureException, initMonitoring };
