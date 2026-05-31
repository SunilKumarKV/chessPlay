const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

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
const logger = require("../utils/safeLogger");
const auth = require("../middleware/auth");
const { queueEmailEvent } = require("../services/emailEventService");
const {
  createUser,
  findUserByEmail,
  findUserByEmailOrUsername,
  findUserByEmailVerificationHash,
  findUserById,
  markEmailVerified,
  setEmailVerificationToken,
  setPasswordResetToken,
  updateUserAuthSession,
} = require("../src/repositories/userRepository");

const router = express.Router();
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MOBILE_ACCESS_EXPIRES_IN_SECONDS = 15 * 60;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function frontendBaseUrl() {
  return process.env.FRONTEND_ORIGINS?.split(",")[0] || "http://localhost:5173";
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
    if (!username || !/^[a-zA-Z0-9]+$/.test(username)) return res.status(400).json({ message: "Username must be alphanumeric only" });
    const existingUser = await findUserByEmailOrUsername(email, username);
    if (existingUser) return res.status(400).json({ message: existingUser.email === email ? "Email already exists" : "Username already exists" });
    const passwordHash = await bcrypt.hash(String(password), 12);
    const user = await createUser({ username, email, passwordHash });
    await issuePrismaSession(res, user);
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

router.post("/mobile/register", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const emailValidation = validateProductionEmail(req.body.email);
    if (!emailValidation.ok) return res.status(400).json({ message: emailValidation.message });
    const email = emailValidation.email;
    const passwordError = validateStrongPassword(password);
    if (passwordError) return res.status(400).json({ message: passwordError });
    if (!username || !/^[a-zA-Z0-9]+$/.test(username)) return res.status(400).json({ message: "Username must be alphanumeric only" });
    const existingUser = await findUserByEmailOrUsername(email, username);
    if (existingUser) return res.status(400).json({ message: existingUser.email === email ? "Email already exists" : "Username already exists" });
    const passwordHash = await bcrypt.hash(String(password), 12);
    const user = await createUser({ username, email, passwordHash });
    const tokens = await issueMobileTokenSet(user);
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
    if (!user || user.deletedAt) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) return res.json({ message: "Email is already verified" });
    const token = randomToken();
    await setEmailVerificationToken(user.id, hashToken(token), new Date(Date.now() + 24 * 60 * 60 * 1000));
    const verifyUrl = `${frontendBaseUrl()}/verify-email?token=${token}`;
    await sendSecurityEmail({ to: user.email, subject: "Verify your ChessPlay account", text: `Verify your email: ${verifyUrl}` });
    return res.json({ message: "Verification email sent" });
  } catch (error) {
    logger.error("Prisma resend verification error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/verify-email", authLimiter, async (req, res) => {
  try {
    const token = String(req.body.token || "");
    if (!token) return res.status(400).json({ message: "Verification token is required" });
    const user = await findUserByEmailVerificationHash(hashToken(token));
    if (!user) return res.status(400).json({ message: "Invalid or expired verification token" });
    await markEmailVerified(user.id);
    return res.json({ message: "Email verified successfully" });
  } catch (error) {
    logger.error("Prisma verify email error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await findUserByEmail(email);
    if (!user || user.deletedAt) return res.json({ message: "If the account exists, a reset email was sent" });
    const token = randomToken();
    await setPasswordResetToken(user.id, hashToken(token), new Date(Date.now() + 30 * 60 * 1000));
    const resetUrl = `${frontendBaseUrl()}/reset-password?token=${token}`;
    await sendSecurityEmail({ to: user.email, subject: "Reset your ChessPlay password", text: `Reset your password: ${resetUrl}` });
    return res.json({ message: "If the account exists, a reset email was sent" });
  } catch (error) {
    logger.error("Prisma forgot password error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
