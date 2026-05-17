const logger = require("./safeLogger");

let sentry = null;

function initMonitoring() {
  if (!process.env.SENTRY_DSN) return;
  try {
    // Optional dependency. Production can install/configure Sentry without making local dev depend on it.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    sentry = require("@sentry/node");
    sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || "development" });
    logger.info("Sentry monitoring enabled");
  } catch {
    logger.warn("Sentry DSN configured, but @sentry/node is not installed. Continuing without monitoring.");
  }
}

function captureException(error, context = {}) {
  if (sentry) sentry.captureException(error, { extra: context });
}

module.exports = { captureException, initMonitoring };
