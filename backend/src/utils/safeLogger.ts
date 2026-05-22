// @ts-nocheck
const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /(accessToken|refreshToken|authToken|jwt|token|password|secret|key|credential|signature)=([^&\s]+)/gi,
  /((?:postgresql|postgres|mysql|redis):\/\/)([^@\s]+)@/gi,
  /(RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|JWT_SECRET|JWT_ACCESS_SECRET|JWT_REFRESH_SECRET)[=:][^\s,]+/gi,
];

function redact(value) {
  if (value instanceof Error) {
    return { name: value.name, message: redact(value.message), stack: process.env.NODE_ENV === "production" ? undefined : redact(value.stack || "") };
  }
  if (typeof value === "string") {
    return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, (match, prefix) => (prefix ? `${prefix}[REDACTED]` : "[REDACTED]")), value);
  }
  if (!value || typeof value !== "object") return value;
  try { return JSON.parse(redact(JSON.stringify(value))); } catch { return "[Unserializable]"; }
}

function log(level, message, meta) {
  const payload = typeof meta === "undefined" ? "" : redact(meta);
  const safeMessage = redact(message);
  if (level === "error") console.error(safeMessage, payload);
  else if (level === "warn") console.warn(safeMessage, payload);
  else console.log(safeMessage, payload);
}

const logger = {
  error: (message, meta) => log("error", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  info: (message, meta) => log("info", message, meta),
  redact,
};

export { logger, redact };
export default logger;
