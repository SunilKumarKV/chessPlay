// @ts-nocheck
async function sendSecurityEmail({ to, subject, text }) {
  // Production hook: connect SMTP/SendGrid/Resend here. For now we log safely in non-production.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV EMAIL] To: ${to}\nSubject: ${subject}\n${text}`);
    return;
  }

  if (!process.env.SMTP_HOST) {
    console.warn('SMTP is not configured. Security email was not sent.');
    return;
  }

  // Keep this dependency-free by default. Add nodemailer/provider SDK when SMTP keys are ready.
  console.warn('SMTP provider adapter is pending. Configure backend/utils/email.js before final public launch.');
}

export { sendSecurityEmail };
