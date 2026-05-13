const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const BLOCKED_EMAIL_DOMAINS = new Set([
  'example.com','example.org','example.net','email.com','test.com','mailinator.com','tempmail.com','10minutemail.com','guerrillamail.com','yopmail.com','fakeinbox.com','trashmail.com'
]);

function parseCsvEnv(value) {
  return String(value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateProductionEmail(email) {
  const normalized = normalizeEmail(email);
  if (!validator.isEmail(normalized, { allow_utf8_local_part: false })) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  const domain = normalized.split('@').pop();
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) {
    return { ok: false, message: 'Temporary, demo, or placeholder emails are not allowed.' };
  }
  const allowedDomains = parseCsvEnv(process.env.AUTH_ALLOWED_EMAIL_DOMAINS);
  if (allowedDomains.length && !allowedDomains.includes(domain)) {
    return { ok: false, message: `Only authorized email domains are allowed: ${allowedDomains.join(', ')}` };
  }
  return { ok: true, email: normalized, domain };
}

function validateStrongPassword(password) {
  const value = String(password || '');
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Password must include at least one letter and one number.';
  return '';
}

function getJwtSecret(kind = 'access') {
  if (kind === 'refresh') return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
}

function signAccessToken(user) {
  return jwt.sign(
    { userId: String(user._id), username: user.username, type: 'access' },
    getJwtSecret('access'),
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m' },
  );
}

function signRefreshToken(user, tokenVersion = 0) {
  return jwt.sign(
    { userId: String(user._id), tokenVersion, type: 'refresh' },
    getJwtSecret('refresh'),
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d' },
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function cookieOptions(maxAgeMs) {
  const isProduction = process.env.NODE_ENV === 'production';
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
  if (maxAgeMs) options.maxAge = maxAgeMs;
  if (process.env.COOKIE_DOMAIN) options.domain = process.env.COOKIE_DOMAIN;
  return options;
}

function clearCookieOptions() {
  return cookieOptions();
}

function authUserPayload(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    rating: user.rating,
    avatar: user.avatar || null,
    isGuest: false,
  };
}

async function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, user.tokenVersion || 0);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  res.cookie('accessToken', accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
  res.cookie('authToken', accessToken, cookieOptions(15 * 60 * 1000)); // backward compatibility for older frontend/socket code
}

function clearSessionCookies(res) {
  for (const name of ['accessToken', 'refreshToken', 'authToken']) {
    res.clearCookie(name, clearCookieOptions());
  }
}

function getCookie(req, name) {
  return String(req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function sanitizeText(value, maxLength = 500) {
  return validator.escape(String(value || '').trim().slice(0, maxLength));
}

module.exports = {
  authUserPayload,
  clearSessionCookies,
  getCookie,
  getJwtSecret,
  hashToken,
  issueSession,
  normalizeEmail,
  randomToken,
  sanitizeText,
  signAccessToken,
  validateProductionEmail,
  validateStrongPassword,
};
