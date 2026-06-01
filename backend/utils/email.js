const nodemailer = require('nodemailer');
const logger = require('./safeLogger');

function isMockEmailMode() {
  return process.env.EMAIL_MOCK_MODE === 'true' || process.env.NODE_ENV === 'test';
}

function smtpConfig() {
  return {
    host: process.env.SMTP_HOST || '',
    port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.MAIL_FROM || process.env.SMTP_USER || '',
  };
}

function validateEmailProviderConfig({ throwOnError = false } = {}) {
  if (isMockEmailMode()) return { ok: true, mode: 'mock' };

  const config = smtpConfig();
  const missing = [];
  if (!config.host) missing.push('SMTP_HOST');
  if (!config.port) missing.push('SMTP_PORT');
  if (!config.user) missing.push('SMTP_USER');
  if (!config.pass) missing.push('SMTP_PASS');
  if (!config.from) missing.push('SMTP_FROM');

  if (!missing.length) return { ok: true, mode: 'smtp' };

  const message = `Email provider configuration is incomplete: ${missing.join(', ')}`;
  if (throwOnError) throw new Error(message);
  return { ok: false, mode: 'smtp', missing, message };
}

function createTransport() {
  const config = smtpConfig();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

async function sendSecurityEmail({ to, subject, text }) {
  const validation = validateEmailProviderConfig();

  if (validation.mode === 'mock') {
    logger.info('[email:mock] Security email queued', { to, subject });
    return { ok: true, mocked: true };
  }

  if (!validation.ok) {
    logger.error('[email] Security email delivery skipped: SMTP is not configured', {
      to,
      subject,
      missing: validation.missing,
    });
    throw new Error('Email provider is not configured');
  }

  try {
    const transport = createTransport();
    const info = await transport.sendMail({
      from: smtpConfig().from,
      to,
      subject,
      text,
    });
    logger.info('[email] Security email sent', {
      to,
      subject,
      messageId: info.messageId,
    });
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    logger.error('[email] Security email delivery failed', {
      to,
      subject,
      error: error.message,
      code: error.code,
      command: error.command,
    });
    throw new Error('Email delivery failed');
  }
}

module.exports = {
  isMockEmailMode,
  sendSecurityEmail,
  validateEmailProviderConfig,
};
