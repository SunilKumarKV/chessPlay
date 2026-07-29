// @ts-nocheck
async function sendSecurityEmail({ to, subject, text }) {
  // Production hook: connect SMTP/SendGrid/Resend here. For now we log safely in non-production.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV EMAIL] To: ${to}\nSubject: ${subject}\n${text}`);
    return;
  }

function isMockEmailMode() {
  return process.env.EMAIL_MOCK_MODE === 'true' || process.env.NODE_ENV === 'test';
}

export { sendSecurityEmail };
