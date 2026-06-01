const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const {
  clearSessionCookies,
  cookieOptions,
  getCookie,
  getJwtSecret,
  getRequestAccessToken,
  hashToken,
  randomToken,
  signAccessToken,
  validateProductionEmail,
  validateStrongPassword,
} = require("../utils/security");
const { sendSecurityEmail } = require("../utils/email");
const { generateOtp, hashOtp } = require("../utils/otp");
const logger = require("../utils/safeLogger");
const auth = require("../middleware/auth");
const { queueEmailEvent } = require("../services/emailEventService");
const {
  createUser,
  findUserByEmail,
  findUserByEmailOrUsername,
  findUserById,
  markEmailVerified,
  setEmailVerificationToken,
  setPasswordResetToken,
  clearPasswordResetToken,
  incrementEmailVerificationAttempts,
  incrementPasswordResetAttempts,
  updateUserPassword,
  softDeleteUser,
  updateUserAuthSession,
} = require("../src/repositories/userRepository");
const { getFriendsAndRequests, sendFriendRequest, respondFriendRequest } = require('../src/repositories/userDocumentRepository');

const router = express.Router();
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MOBILE_ACCESS_EXPIRES_IN_SECONDS = 15 * 60;
const OTP_EXPIRES_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const GENERIC_RESET_MESSAGE = "If an account exists, a reset code has been sent.";
const GENERIC_VERIFICATION_MESSAGE = "If the account needs verification, a verification code has been sent.";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

const GENERIC_DUPLICATE_ACCOUNT_MESSAGE = "Unable to create account. Please verify your details or sign in.";

function validateAuthUsername(username) {
  const value = String(username || "").trim();
  if (value.length < 3 || value.length > 16) return "Username must be 3–16 characters.";
  if (!/^[a-zA-Z0-9]+$/.test(value)) return "Username can use letters and numbers only.";
  return "";
}

function frontendBaseUrl() {
  return process.env.FRONTEND_ORIGINS?.split(",")[0] || "http://localhost:5173";
}

function isCooldownActive(sentAt) {
  return sentAt && Date.now() - new Date(sentAt).getTime() < OTP_RESEND_COOLDOWN_MS;
}

function isExpired(expiresAt) {
  return !expiresAt || new Date(expiresAt).getTime() <= Date.now();
}

async function sendPasswordResetOtp(user) {
  const otp = generateOtp();
  await setPasswordResetToken(user.id, hashOtp({ userId: user.id, otp, purpose: "password-reset" }), new Date(Date.now() + OTP_EXPIRES_MS));
  await sendSecurityEmail({
    to: user.email,
    subject: "Your ChessPlay password reset code",
    text: `Your ChessPlay password reset code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
  });
}

async function sendEmailVerificationOtp(user) {
  const otp = generateOtp();
  await setEmailVerificationToken(user.id, hashOtp({ userId: user.id, otp, purpose: "email-verification" }), new Date(Date.now() + OTP_EXPIRES_MS));
  await sendSecurityEmail({
    to: user.email,
    subject: "Verify your ChessPlay email",
    text: `Your ChessPlay verification code is ${otp}. It expires in 10 minutes.`,
  });
}

function prismaUserPayload(user) {
  const role = String(user.role || "USER").toUpperCase();
  return {
    id: user.id,
    _id: user.id,
    username: user.username,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    gamesPlayed: 0,
    gamesWon: 0,
    rating: user.rating,
    avatar: null,
    plan: user.isPremium ? "premium" : "free",
    planStatus: "active",
    planExpiresAt: null,
    isSupporter: false,
    isPremium: Boolean(user.isPremium),
    supporterPlan: "none",
    supporterExpiresAt: null,
    adsDisabled: Boolean(user.isPremium),
    isAdmin: role === "ADMIN",
    isGuest: false,
  };
}

function userForJwt(user) {
  return { ...user, _id: user.id };
}

function signRefreshToken(user, tokenVersion = 0) {
  return jwt.sign({ userId: String(user.id), tokenVersion, type: "refresh" }, getJwtSecret("refresh"), { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d" });
}

function signMobileAccessToken(user) {
  return jwt.sign(
    { userId: String(user.id), username: user.username, tokenVersion: user.tokenVersion || 0, type: "access" },
    getJwtSecret("access"),
    { expiresIn: `${MOBILE_ACCESS_EXPIRES_IN_SECONDS}s` },
  );
}

async function issuePrismaSession(res, user) {
  const accessToken = signAccessToken(userForJwt(user));
  const refreshToken = signRefreshToken(user, user.tokenVersion || 0);
  await updateUserAuthSession(user.id, { refreshTokenHash: hashToken(refreshToken), lastLogin: new Date() });
  res.cookie("accessToken", accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie("refreshToken", refreshToken, cookieOptions(TOKEN_MAX_AGE_MS));
  res.cookie("authToken", accessToken, cookieOptions(15 * 60 * 1000));
  return accessToken;
}

function buildAuthResponse(message, user) {
  return { message, user: prismaUserPayload(user), socketToken: signAccessToken(userForJwt(user)) };
}

async function issueMobileTokenSet(user) {
  const accessToken = signMobileAccessToken(user);
  const refreshToken = signRefreshToken(user, user.tokenVersion || 0);
  await updateUserAuthSession(user.id, { refreshTokenHash: hashToken(refreshToken), lastLogin: new Date() });
  return {
    accessToken,
    refreshToken,
    socketToken: signMobileAccessToken(user),
    expiresIn: MOBILE_ACCESS_EXPIRES_IN_SECONDS,
  };
}

function buildMobileAuthResponse(user, tokens, extra = {}) {
  return { user: prismaUserPayload(user), ...tokens, ...extra };
}

async function userFromMobileAccessToken(token) {
  const decoded = jwt.verify(token, getJwtSecret("access"));
  if (decoded.type && decoded.type !== "access") {
    const error = new Error("Invalid token type");
    error.statusCode = 401;
    throw error;
  }
  if (!decoded.userId) {
    const error = new Error("Invalid token payload");
    error.statusCode = 401;
    throw error;
  }
  const user = await findUserById(decoded.userId);
  if (!user || user.deletedAt) {
    const error = new Error("Invalid session");
    error.statusCode = 401;
    throw error;
  }
  if (typeof decoded.tokenVersion === "number" && decoded.tokenVersion !== (user.tokenVersion || 0)) {
    const error = new Error("Session has expired");
    error.statusCode = 401;
    throw error;
  }
  return { user, decoded };
}

async function userFromMobileRefreshToken(refreshToken) {
  const decoded = jwt.verify(refreshToken, getJwtSecret("refresh"));
  if (decoded.type && decoded.type !== "refresh") {
    const error = new Error("Invalid token type");
    error.statusCode = 401;
    throw error;
  }
  if (!decoded.userId) {
    const error = new Error("Invalid token payload");
    error.statusCode = 401;
    throw error;
  }
  const user = await findUserById(decoded.userId);
  if (!user || user.deletedAt) {
    const error = new Error("Invalid refresh session");
    error.statusCode = 401;
    throw error;
  }
  if (decoded.tokenVersion !== (user.tokenVersion || 0)) {
    const error = new Error("Refresh session has expired");
    error.statusCode = 401;
    throw error;
  }
  if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(refreshToken)) {
    await updateUserAuthSession(user.id, { refreshTokenHash: null, tokenVersion: (user.tokenVersion || 0) + 1 });
    const error = new Error("Refresh session was revoked");
    error.statusCode = 401;
    throw error;
  }
  return { user, decoded };
}

function createRateLimiter({ windowMs, max, message }) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);
    const remaining = Math.max(max - bucket.count, 0);
    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(remaining));
    res.set("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }
    for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
    next();
  };
}

const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many requests from this IP, please try again after 15 minutes" });

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });
    return res.json(prismaUserPayload(user));
  } catch {
    return res.status(500).json({ message: 'Unable to load profile' });
  }
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const emailValidation = validateProductionEmail(req.body.email);
    if (!emailValidation.ok) return res.status(400).json({ message: emailValidation.message });
    const email = emailValidation.email;
    const passwordError = validateStrongPassword(password);
    if (passwordError) return res.status(400).json({ message: passwordError });
    const usernameError = validateAuthUsername(username);
    if (usernameError) return res.status(400).json({ message: usernameError });
    const existingUser = await findUserByEmailOrUsername(email, username);
    if (existingUser) {
      logger.warn("Registration duplicate attempt", {
        reason: existingUser.email === email ? "email" : "username",
        email,
        username,
      });
      return res.status(400).json({ message: GENERIC_DUPLICATE_ACCOUNT_MESSAGE });
    }
    const passwordHash = await bcrypt.hash(String(password), 12);
    const user = await createUser({ username, email, passwordHash });
    await issuePrismaSession(res, user);
    await sendEmailVerificationOtp(user).catch((error) => {
      logger.error("Email verification OTP delivery failed after registration", { userId: user.id, email: user.email, error: error.message });
    });
    await queueEmailEvent("welcome", { user: user.id, email: user.email, payload: { username: user.username } }).catch(() => {});
    return res.status(201).json({ ...buildAuthResponse("Account created successfully", user), referralConnected: false });
  } catch (error) {
    logger.error("Prisma registration error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);
    const user = await findUserByEmail(email);
    if (!user || user.deletedAt || !user.passwordHash) return res.status(400).json({ message: "Invalid credentials" });
    const isMatch = await bcrypt.compare(String(password || ""), user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
    await issuePrismaSession(res, user);
    return res.json(buildAuthResponse("Login successful", user));
  } catch (error) {
    logger.error("Prisma login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

async function verifyGoogleCredential(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    const error = new Error("Google authentication is not configured");
    error.statusCode = 503;
    throw error;
  }
  const params = new URLSearchParams({ id_token: String(credential || "") });
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?${params}`);
  if (!response.ok) {
    const error = new Error("Invalid Google credential");
    error.statusCode = 401;
    throw error;
  }
  const profile = await response.json();
  if (profile.aud !== clientId || profile.email_verified !== "true" || !profile.email) {
    const error = new Error("Invalid Google credential");
    error.statusCode = 401;
    throw error;
  }
  return {
    email: normalizeEmail(profile.email),
    name: String(profile.name || profile.email.split("@")[0] || "ChessPlayer"),
  };
}

function googleUsernameFromProfile(profile) {
  return String(profile.name || profile.email.split("@")[0] || "ChessPlayer")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 14) || "ChessPlayer";
}

async function uniqueGoogleUsername(profile) {
  const base = googleUsernameFromProfile(profile);
  for (let index = 0; index < 10; index += 1) {
    const suffix = index === 0 ? "" : String(crypto.randomInt(10, 9999));
    const username = `${base}${suffix}`.slice(0, 16);
    const existing = await findUserByEmailOrUsername(`unused-${randomToken()}@local.invalid`, username);
    if (!existing) return username;
  }
  return `Player${crypto.randomInt(100000, 999999)}`;
}

router.post("/google", authLimiter, async (req, res) => {
  try {
    const profile = await verifyGoogleCredential(req.body.credential);
    let user = await findUserByEmail(profile.email);
    let isNewUser = false;
    if (!user) {
      const username = await uniqueGoogleUsername(profile);
      user = await createUser({ username, email: profile.email, passwordHash: null, emailVerified: true });
      isNewUser = true;
    } else if (!user.emailVerified) {
      user = await markEmailVerified(user.id);
    }
    if (user.deletedAt) return res.status(400).json({ message: "Invalid credentials" });
    await issuePrismaSession(res, user);
    if (isNewUser) await queueEmailEvent("welcome", { user: user.id, email: user.email, payload: { username: user.username, provider: "google" } }).catch(() => {});
    return res.json(buildAuthResponse("Login successful", user));
  } catch (error) {
    logger.error("Prisma Google auth error:", { message: error.message, statusCode: error.statusCode });
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Google login failed" });
  }
});

router.post("/mobile/register", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const emailValidation = validateProductionEmail(req.body.email);
    if (!emailValidation.ok) return res.status(400).json({ message: emailValidation.message });
    const email = emailValidation.email;
    const passwordError = validateStrongPassword(password);
    if (passwordError) return res.status(400).json({ message: passwordError });
    const usernameError = validateAuthUsername(username);
    if (usernameError) return res.status(400).json({ message: usernameError });
    const existingUser = await findUserByEmailOrUsername(email, username);
    if (existingUser) {
      logger.warn("Registration duplicate attempt", {
        reason: existingUser.email === email ? "email" : "username",
        email,
        username,
      });
      return res.status(400).json({ message: GENERIC_DUPLICATE_ACCOUNT_MESSAGE });
    }
    const passwordHash = await bcrypt.hash(String(password), 12);
    const user = await createUser({ username, email, passwordHash });
    const tokens = await issueMobileTokenSet(user);
    await sendEmailVerificationOtp(user).catch((error) => {
      logger.error("Email verification OTP delivery failed after mobile registration", { userId: user.id, email: user.email, error: error.message });
    });
    await queueEmailEvent("welcome", { user: user.id, email: user.email, payload: { username: user.username } }).catch(() => {});
    return res.status(201).json(buildMobileAuthResponse(user, tokens, { referralConnected: false }));
  } catch (error) {
    logger.error("Prisma mobile registration error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/mobile/login", authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);
    const user = await findUserByEmail(email);
    if (!user || user.deletedAt || !user.passwordHash) return res.status(400).json({ message: "Invalid credentials" });
    const isMatch = await bcrypt.compare(String(password || ""), user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
    const tokens = await issueMobileTokenSet(user);
    return res.json(buildMobileAuthResponse(user, tokens, { referralConnected: false }));
  } catch (error) {
    logger.error("Prisma mobile login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/mobile/refresh", authLimiter, async (req, res) => {
  try {
    const refreshToken = String(req.body.refreshToken || "").trim();
    if (!refreshToken) return res.status(400).json({ message: "Refresh token is required" });
    const { user } = await userFromMobileRefreshToken(refreshToken);
    const tokens = await issueMobileTokenSet(user);
    return res.json(buildMobileAuthResponse(user, tokens));
  } catch (error) {
    return res.status(error.statusCode || 401).json({ message: error.message || "Invalid or expired refresh token" });
  }
});

router.post("/mobile/logout", async (req, res) => {
  try {
    const refreshToken = String(req.body.refreshToken || "").trim();
    const bearerToken = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
    let user = null;
    if (bearerToken) {
      ({ user } = await userFromMobileAccessToken(bearerToken));
    } else if (refreshToken) {
      ({ user } = await userFromMobileRefreshToken(refreshToken));
    } else {
      return res.status(400).json({ message: "Access token or refresh token is required" });
    }
    await updateUserAuthSession(user.id, { refreshTokenHash: null, tokenVersion: (user.tokenVersion || 0) + 1 });
    return res.json({ message: "Logged out" });
  } catch (error) {
    return res.status(error.statusCode || 401).json({ message: error.message || "Invalid session" });
  }
});

router.get("/mobile/session", async (req, res) => {
  try {
    const bearerToken = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
    if (!bearerToken) return res.status(401).json({ message: "No token provided" });
    const { user } = await userFromMobileAccessToken(bearerToken);
    return res.json({ user: prismaUserPayload(user) });
  } catch (error) {
    return res.status(error.statusCode || 401).json({ message: error.message || "Invalid or expired token" });
  }
});

router.get("/mobile/socket-token", async (req, res) => {
  try {
    const bearerToken = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
    if (!bearerToken) return res.status(401).json({ message: "No token provided" });
    const { user } = await userFromMobileAccessToken(bearerToken);
    return res.json({ socketToken: signMobileAccessToken(user) });
  } catch (error) {
    return res.status(error.statusCode || 401).json({ message: error.message || "Unable to create socket token" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const refreshToken = getCookie(req, "refreshToken");
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, getJwtSecret("refresh"));
      if (!decoded.type || decoded.type === "refresh") {
        const user = await findUserById(decoded.userId);
        if (
          user &&
          !user.deletedAt &&
          decoded.tokenVersion === (user.tokenVersion || 0) &&
          user.refreshTokenHash &&
          user.refreshTokenHash === hashToken(refreshToken)
        ) {
          await updateUserAuthSession(user.id, { refreshTokenHash: null, tokenVersion: (user.tokenVersion || 0) + 1 });
        }
      }
    }
  } catch {
    // Logout remains idempotent; invalid browser sessions are cleared below.
  }

  clearSessionCookies(res);
  return res.json({ message: "Logged out" });
});

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = getCookie(req, "refreshToken");
    if (!refreshToken) return res.status(401).json({ message: "Refresh token missing" });
    const decoded = jwt.verify(refreshToken, getJwtSecret("refresh"));
    if (decoded.type && decoded.type !== "refresh") {
      clearSessionCookies(res);
      return res.status(401).json({ message: "Invalid token type" });
    }
    const user = await findUserById(decoded.userId);
    if (!user || user.deletedAt) {
      clearSessionCookies(res);
      return res.status(401).json({ message: "Invalid refresh session" });
    }
    if (decoded.tokenVersion !== (user.tokenVersion || 0)) {
      clearSessionCookies(res);
      return res.status(401).json({ message: "Refresh session has expired" });
    }
    if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(refreshToken)) {
      await updateUserAuthSession(user.id, { refreshTokenHash: null, tokenVersion: (user.tokenVersion || 0) + 1 });
      clearSessionCookies(res);
      return res.status(401).json({ message: "Refresh session was revoked" });
    }
    await issuePrismaSession(res, user);
    return res.json(buildAuthResponse("Session refreshed", user));
  } catch {
    clearSessionCookies(res);
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

router.get("/session", async (req, res) => {
  try {
    const token = getRequestAccessToken(req);
    if (!token) return res.json({ user: null });
    const decoded = jwt.verify(token, getJwtSecret("access"));
    if ((decoded.type && decoded.type !== "access") || !decoded.userId) {
      clearSessionCookies(res);
      return res.json({ user: null });
    }
    const user = await findUserById(decoded.userId);
    if (!user || user.deletedAt) {
      clearSessionCookies(res);
      return res.json({ user: null });
    }
    if (decoded.tokenVersion !== (user.tokenVersion || 0)) {
      clearSessionCookies(res);
      return res.json({ user: null });
    }
    return res.json({ user: prismaUserPayload(user) });
  } catch {
    clearSessionCookies(res);
    return res.json({ user: null });
  }
});

router.get("/socket-token", auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) {
      clearSessionCookies(res);
      return res.status(401).json({ message: "Invalid session" });
    }
    return res.json({ socketToken: signAccessToken(userForJwt(user)) });
  } catch {
    return res.status(401).json({ message: "Unable to create socket token" });
  }
});

router.post("/resend-verification", authLimiter, auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt || user.emailVerified) return res.json({ message: GENERIC_VERIFICATION_MESSAGE });
    if (isCooldownActive(user.emailVerificationSentAt)) {
      return res.status(429).json({ message: "Please wait before requesting another verification code." });
    }
    await sendEmailVerificationOtp(user);
    return res.json({ message: GENERIC_VERIFICATION_MESSAGE });
  } catch (error) {
    logger.error("Prisma resend verification error:", error);
    return res.json({ message: GENERIC_VERIFICATION_MESSAGE });
  }
});

router.post("/verify-email", authLimiter, auth, async (req, res) => {
  try {
    const otp = String(req.body.otp || req.body.code || "").trim();
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ message: "Enter the 6-digit verification code." });
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(401).json({ message: "Invalid session" });
    if (user.emailVerified) return res.json({ message: "Email verified successfully" });
    if ((user.emailVerificationAttempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many incorrect codes. Request a new verification code." });
    }
    if (isExpired(user.emailVerificationExpires)) {
      return res.status(400).json({ message: "Verification code expired. Request a new code." });
    }
    const expectedHash = hashOtp({ userId: user.id, otp, purpose: "email-verification" });
    if (!user.emailVerificationTokenHash || user.emailVerificationTokenHash !== expectedHash) {
      await incrementEmailVerificationAttempts(user.id);
      return res.status(400).json({ message: "Invalid verification code." });
    }
    await markEmailVerified(user.id);
    return res.json({ message: "Email verified successfully" });
  } catch (error) {
    logger.error("Prisma verify email error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const emailValidation = validateProductionEmail(req.body.email);
    if (!emailValidation.ok) return res.json({ message: GENERIC_RESET_MESSAGE });
    const email = emailValidation.email;
    const user = await findUserByEmail(email);
    if (!user || user.deletedAt) return res.json({ message: GENERIC_RESET_MESSAGE });
    if (isCooldownActive(user.passwordResetSentAt)) return res.json({ message: GENERIC_RESET_MESSAGE });
    await sendPasswordResetOtp(user);
    return res.json({ message: GENERIC_RESET_MESSAGE });
  } catch (error) {
    logger.error("Prisma forgot password OTP error:", { message: error.message });
    return res.json({ message: GENERIC_RESET_MESSAGE });
  }
});

router.post("/reset-password", authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const otp = String(req.body.otp || req.body.code || "").trim();
    const emailValidation = validateProductionEmail(req.body.email);
    if (!emailValidation.ok) return res.status(400).json({ message: "Invalid or expired reset code" });
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ message: "Enter the 6-digit reset code." });
    const passwordError = validateStrongPassword(password);
    if (passwordError) return res.status(400).json({ message: passwordError });
    const user = await findUserByEmail(emailValidation.email);
    if (!user || user.deletedAt) return res.status(400).json({ message: "Invalid or expired reset code" });
    if ((user.passwordResetAttempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many incorrect codes. Request a new reset code." });
    }
    if (isExpired(user.passwordResetExpires)) return res.status(400).json({ message: "Invalid or expired reset code" });
    const expectedHash = hashOtp({ userId: user.id, otp, purpose: "password-reset" });
    if (!user.passwordResetTokenHash || user.passwordResetTokenHash !== expectedHash) {
      await incrementPasswordResetAttempts(user.id);
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }
    const passwordHash = await bcrypt.hash(String(password), 12);
    await updateUserPassword(user.id, passwordHash);
    await updateUserAuthSession(user.id, { refreshTokenHash: null, tokenVersion: (user.tokenVersion || 0) + 1 });
    await clearPasswordResetToken(user.id);
    clearSessionCookies(res);
    return res.json({ message: "Password reset successful. Please log in again." });
  } catch (error) {
    logger.error("Prisma reset password error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.put("/password", authLimiter, auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) return res.status(400).json({ message: passwordError });
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt || !user.passwordHash) return res.status(404).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(String(currentPassword || ""), user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });
    const passwordHash = await bcrypt.hash(String(newPassword), 12);
    await updateUserPassword(user.id, passwordHash);
    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    logger.error("Prisma password update error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.delete("/account", authLimiter, auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: "User not found" });
    const anonymizedEmail = `deleted-${user.id}@deleted.chessplay.local`;
    const anonymizedUsername = `DeletedUser${String(user.id).slice(-6)}`;
    const passwordHash = await bcrypt.hash(`${randomToken()}A1`, 12);
    await softDeleteUser(user.id, {
      email: anonymizedEmail,
      username: anonymizedUsername,
      passwordHash,
      deletedAt: new Date(),
      refreshTokenHash: null,
    });
    clearSessionCookies(res);
    return res.json({ message: "Account deleted" });
  } catch (error) {
    logger.error("Prisma delete account error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Friends endpoints (Prisma-backed via document records)
router.get('/friends', auth, async (req, res) => {
  try {
    const data = await getFriendsAndRequests(req.user.userId);
    return res.json({ friends: data.friends, requests: data.requests, count: data.friends.length });
  } catch (error) {
    logger.error('Prisma friends error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/friends/request', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || userId === req.user.userId) return res.status(400).json({ message: 'Invalid user' });
    await sendFriendRequest(req.user.userId, userId);
    return res.json({ message: 'Friend request sent' });
  } catch (error) {
    logger.error('Prisma friend request error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/friends/respond', auth, async (req, res) => {
  try {
    const { requestId, action } = req.body;
    if (!['accept', 'decline'].includes(action)) return res.status(400).json({ message: 'Invalid action' });
    const result = await respondFriendRequest(req.user.userId, requestId, action);
    return res.json({ message: result.message });
  } catch (error) {
    logger.error('Prisma friend respond error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
