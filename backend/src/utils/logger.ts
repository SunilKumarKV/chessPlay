type LogMeta = Record<string, unknown>;

function formatMeta(meta?: LogMeta) {
  return meta && Object.keys(meta).length ? meta : undefined;
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    const details = formatMeta(meta);
    if (details) {
      console.log(message, details);
      return;
    }
    console.log(message);
  },

  warn(message: string, meta?: LogMeta) {
    const details = formatMeta(meta);
    if (details) {
      console.warn(message, details);
      return;
    }
    console.warn(message);
  },

  error(message: string, error?: unknown, meta?: LogMeta) {
    const details = formatMeta(meta);
    if (details) {
      console.error(message, error, details);
      return;
    }
    console.error(message, error);
  },
};

