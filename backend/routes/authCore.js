const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const {
  clearSessionCookies,
  getCookie,
  getJwtSecret,
  getRequestAccessToken,
  hashToken,
  signAccessToken,
  validateProductionEmail,
  validateStrongPassword,
} = require("../utils/security");
const logger = require("../utils/safeLogger");
const auth = require("../middleware/auth");
const { queueEmailEvent } = require("../services/emailEventService");
const {
  createUser,
  findUserByEmail,
  findUserByEmailOrUsername,
  findUserById,
  updateUserAuthSession,
} = require("../src/repositories/userRepository");

const router = express.Router();
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
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

function cookieOptions(maxAgeMs) {
  const isProduction = process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
  if (maxAgeMs) options.maxAge = maxAgeMs;
  if (process.env.COOKIE_DOMAIN) options.domain = process.env.COOKIE_DOMAIN;
  return options;
}

function signRefreshToken(user, tokenVersion = 0) {
  return jwt.sign(
    { userId: String(user.id), tokenVersion, type: "refresh" },
    getJwtSecret("refresh"),
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d" },
  );
}

async function issuePrismaSession(res, user) {
  const accessToken = signAccessToken(userForJwt(user));
  const refreshToken = signRefreshToken(user, user.tokenVersion || 0);
  await updateUserAuthSession(user.id, {
    refreshTokenHash: hashToken(refreshToken),
    lastLogin: new Date(),
  });
  res.cookie("accessToken", accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie("refreshToken", refreshToken, cookieOptions(TOKEN_MAX_AGE_MS));
  res.cookie("authToken", accessToken, cookieOptions(15 * 60 * 1000));
  return accessToken;
}

function buildAuthResponse(message, user) {
  return {
    message,
    user: prismaUserPayload(user),
    socketToken: signAccessToken(userForJwt(user)),
  };
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
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
    next();
  };
}

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const emailValidation = validateProductionEmail(req.body.email);
    if (!emailValidation.ok) return res.status(400).json({ message: emailValidation.message });
    const email = emailValidation.email;

    const passwordError = validateStrongPassword(password);
    if (passwordError) return res.status(400).json({ message: passwordError });

    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!username || !usernameRegex.test(username)) {
      return res.status(400).json({ message: "Username must be alphanumeric only" });
    }

    const existingUser = await findUserByEmailOrUsername(email, username);
    if (existingUser) {
      return res.status(400).json({ message: existingUser.email === email ? "Email already exists" : "Username already exists" });
    }

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
    if (!user || user.deletedAt) return res.status(400).json({ message: "Invalid credentials" });
    if (!user.passwordHash) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(String(password || ""), user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    await issuePrismaSession(res, user);
    return res.json(buildAuthResponse("Login successful", user));
  } catch (error) {
    logger.error("Prisma login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/logout", (_req, res) => {
  clearSessionCookies(res);
  return res.json({ message: "Logged out" });
});

router.get("/session", async (req, res) => {
  try {
    const token = getRequestAccessToken(req);
    if (!token) return res.json({ user: null });

    const decoded = jwt.verify(token, getJwtSecret("access"));
    if (!decoded.userId) return res.json({ user: null });

    const user = await findUserById(decoded.userId);
    if (!user || user.deletedAt) {
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

module.exports = router;
