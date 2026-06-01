const nodemailer = require('nodemailer');
const logger = require('./safeLogger');
const { Resend } = require('resend');

function isMockEmailMode() {
  return process.env.EMAIL_MOCK_MODE === 'true' || process.env.NODE_ENV === 'test';
}

function getEmailProvider() {
  if (isMockEmailMode()) return 'mock';
  return (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
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

function resendConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.MAIL_FROM || '',
  };
}

function validateEmailProviderConfig({ throwOnError = false } = {}) {
  const provider = getEmailProvider();
  if (provider === 'mock') return { ok: true, mode: 'mock' };

  if (provider === 'resend') {
    const cfg = resendConfig();
    const missing = [];
    if (!cfg.apiKey) missing.push('RESEND_API_KEY');
    if (!cfg.from) missing.push('EMAIL_FROM');
    if (!missing.length) return { ok: true, mode: 'resend' };
    const message = `Email provider configuration is incomplete: ${missing.join(', ')}`;
    if (throwOnError) throw new Error(message);
    return { ok: false, mode: 'resend', missing, message };
  }

  // default to smtp validation
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
    logger.info('EMAIL_PROVIDER_MOCK_MODE', { to, subject });
    return { ok: true, mocked: true };
  }

  if (!validation.ok) {
    logger.error('EMAIL_PROVIDER_NOT_CONFIGURED', {
      to,
      subject,
      missing: validation.missing,
    });
    throw new Error('Email provider is not configured');
  }

  try {
    if (validation.mode === 'resend') {
      const cfg = resendConfig();
      const resendClient = new Resend(cfg.apiKey);
      const info = await resendClient.emails.send({
        from: cfg.from,
        to,
        subject,
        text,
      });
      // info.id is returned by Resend; preserve safe logging
      logger.info('EMAIL_SEND_SUCCESS', {
        to,
        subject,
        messageId: info?.id || info?.messageId,
      });
      return { ok: true, messageId: info?.id || info?.messageId };
    }

    // default to SMTP
    const transport = createTransport();
    const info = await transport.sendMail({
      from: smtpConfig().from,
      to,
      subject,
      text,
    });
    logger.info('EMAIL_SEND_SUCCESS', {
      to,
      subject,
      messageId: info.messageId,
    });
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    logger.error('EMAIL_SEND_FAILED', {
      to,
      subject,
      code: error?.code,
      command: error?.command,
    });
    throw new Error('Email delivery failed');
  }
}

module.exports = {
  isMockEmailMode,
  sendSecurityEmail,
  validateEmailProviderConfig,
};
