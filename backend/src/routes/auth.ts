// @ts-nocheck
import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User";
import Referral from "../models/Referral";
import SecurityEvent from "../models/SecurityEvent";
import { storeAvatar, safeExternalImageUrl } from "../utils/avatarStorage";
import { authUserPayload, clearSessionCookies, getCookie as getSecureCookie, getJwtSecret, getRequestAccessToken, hashToken, issueSession as issueSecureSession, randomToken, sanitizeText, signAccessToken, validateProductionEmail as validateSecureEmail, validateStrongPassword, } from "../utils/security";
import { sendSecurityEmail } from "../utils/email";
import logger from "../utils/safeLogger";
import auth from "../middleware/auth";
import { queueEmailEvent } from "../services/emailEventService";

const router = express.Router();
const PUBLIC_USER_FIELDS = "username avatar country title rating gamesPlayed gamesWon privacy friends";
const FRIEND_USER_FIELDS = "username avatar country title rating gamesPlayed gamesWon";
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SEARCH_QUERY_LENGTH = 32;
const MAX_LEADERBOARD_LIMIT = 50;

const BLOCKED_EMAIL_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "email.com",
  "test.com",
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
]);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateProductionEmail(email) {
  return validateSecureEmail(email);
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE_MS,
  };
  if (process.env.COOKIE_DOMAIN) options.domain = process.env.COOKIE_DOMAIN;
  return options;
}

function clearCookieOptions() {
  const options = cookieOptions();
  delete options.maxAge;
  return options;
}

function setAuthCookie(res, token) {
  res.cookie("authToken", token, cookieOptions());
}

function getCookie(req, name) {
  return getSecureCookie(req, name);
}

function authUserPayloadLocal(user) {
  return authUserPayload(user);
}

async function issueSession(res, user) {
  await issueSecureSession(res, user);
}

function buildAuthResponse(message, user) {
  return {
    message,
    user: authUserPayload(user),
    // Short-lived token used only for Socket.IO handshake fallback when cross-site cookies are blocked.
    socketToken: signAccessToken(user),
  };
}


async function buildUniqueUsername(seed) {
  const base =
    String(seed || "player")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 16) || "player";
  let candidate = base;
  let suffix = 0;

  while (await User.exists({ username: candidate })) {
    suffix += 1;
    candidate = `${base.slice(0, 16 - String(suffix).length)}${suffix}`;
  }

  return candidate;
}

async function verifyGoogleCredential(credential) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Google OAuth is not configured on the server");
  }

  const params = new URLSearchParams({ id_token: credential });
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?${params}`);
  const profile = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(profile.error_description || "Invalid Google credential");
  }

  if (profile.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("Google credential audience does not match this app");
  }

  if (profile.email_verified !== "true" && profile.email_verified !== true) {
    throw new Error("Google email is not verified");
  }

  return profile;
}


function normalizeReferralCode(code) {
  return String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
}

async function connectReferralForNewUser(user, referralCode) {
  const code = normalizeReferralCode(referralCode);
  if (!code || !/^[A-Z0-9]{6,16}$/.test(code)) return false;
  const referrer = await User.findOne({ referralCode: code }).select("_id referralCode");
  if (!referrer || String(referrer._id) === String(user._id)) return false;
  if (user.referredBy) return false;
  user.referredBy = referrer._id;
  await user.save();
  const referralResult = await Referral.updateOne(
    { referrer: referrer._id, referred: user._id },
    { $setOnInsert: { referrer: referrer._id, referred: user._id, code, status: "joined", rewardNote: "Joined through referral. Referrer received 3 bonus puzzle credits." } },
    { upsert: true },
  );
  if (referralResult.upsertedCount > 0) {
    await User.findByIdAndUpdate(referrer._id, { $inc: { bonusPuzzleCredits: 3 } }).catch(() => {});
  }
  return true;
}

async function recordSecurityEvent(req, payload) {
  try {
    await SecurityEvent.create({
      ...payload,
      ip: req.ip,
      userAgent: req.headers["user-agent"] || "",
    });
  } catch {
    // Security event logging must never block authentication.
  }
}

function isFriend(user, otherUserId) {
  return Boolean(
    user?.friends?.some((friendId) => String(friendId) === String(otherUserId)),
  );
}

function publicUser(user, relationship = "none") {
  return {
    id: user._id,
    username: user.username,
    avatar: user.avatar || null,
    country: user.country,
    title: user.title,
    rating: user.rating,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    relationship,
  };
}

function publicProfile(user) {
  return {
    id: user._id,
    _id: user._id,
    username: user.username,
    avatar: user.avatar || null,
    country: user.country,
    title: user.title,
    bio: user.bio || "",
    createdAt: user.createdAt,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    gamesLost: user.gamesLost,
    gamesDrawn: user.gamesDrawn,
    rating: user.rating,
    puzzleRating: user.puzzleRating,
    highestPuzzleRating: user.highestPuzzleRating,
    puzzlesSolved: user.puzzlesSolved,
  };
}

function createRateLimiter({ windowMs, max, message }) {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const current = buckets.get(key);
    const bucket =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + windowMs };

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

// Register
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const referralCode = req.body.referralCode || req.body.ref || "";
    const emailValidation = validateProductionEmail(req.body.email);
    if (!emailValidation.ok) {
      return res.status(400).json({ message: emailValidation.message });
    }
    const email = emailValidation.email;

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!username || !usernameRegex.test(username)) {
      return res.status(400).json({ message: "Username must be alphanumeric only" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already exists"
            : "Username already exists",
      });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();
    const referralConnected = await connectReferralForNewUser(user, referralCode);

    await issueSession(res, user);
    await recordSecurityEvent(req, { type: "register_success", email: user.email, user: user._id });
    await queueEmailEvent("welcome", { user: user._id, email: user.email, payload: { username: user.username } });

    res.status(201).json({ ...buildAuthResponse("Account created successfully", user), referralConnected });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const referralCode = req.body.referralCode || req.body.ref || "";
    const email = normalizeEmail(req.body.email);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      await recordSecurityEvent(req, { type: "login_failed", email, reason: "user_not_found" });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.isBanned) {
      await recordSecurityEvent(req, { type: "login_failed", email, user: user._id, reason: "banned_account" });
      return res.status(403).json({ message: "This account is temporarily restricted. Contact support if you believe this is a mistake." });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await recordSecurityEvent(req, { type: "login_failed", email, user: user._id, reason: "wrong_password" });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();
    const referralConnected = await connectReferralForNewUser(user, referralCode);

    await issueSession(res, user);
    await recordSecurityEvent(req, { type: user.isAdmin ? "admin_login" : "login_success", email: user.email, user: user._id });

    res.json(buildAuthResponse("Login successful", user));
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Google login
router.post("/google", authLimiter, async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const profile = await verifyGoogleCredential(credential);
    const emailValidation = validateProductionEmail(profile.email);
    if (!emailValidation.ok) {
      return res.status(400).json({ message: emailValidation.message });
    }
    const email = emailValidation.email;

    let user = await User.findOne({ email });
    const isNewUser = !user;
    if (!user) {
      user = new User({
        username: await buildUniqueUsername(profile.name || email.split("@")[0]),
        email,
        password: crypto.randomBytes(32).toString("hex"),
        avatar: profile.picture || null,
      });
    } else if (!user.avatar && profile.picture) {
      user.avatar = profile.picture;
    }

    if (user.isBanned) {
      await recordSecurityEvent(req, { type: "login_failed", email: user.email, user: user._id, reason: "banned_account_google" });
      return res.status(403).json({ message: "This account is temporarily restricted. Contact support if you believe this is a mistake." });
    }

    user.lastLogin = new Date();
    await user.save();
    await issueSession(res, user);
    await recordSecurityEvent(req, { type: user.isAdmin ? "admin_login" : "login_success", email: user.email, user: user._id });
    if (isNewUser) await queueEmailEvent("welcome", { user: user._id, email: user.email, payload: { username: user.username, provider: "google" } });

    res.json(buildAuthResponse("Google login successful", user));
  } catch (error) {
    logger.error("Google login error:", error.message);
    res.status(401).json({ message: error.message || "Google login failed" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  clearSessionCookies(res);
  res.json({ message: "Logged out" });
});

// Current session without noisy 401s for first page load
router.get("/session", async (req, res) => {
  try {
    const token = getRequestAccessToken(req);
    if (!token) {
      return res.json({ user: null });
    }

    const decoded = jwt.verify(token, getJwtSecret("access"));
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      clearSessionCookies(res);
      return res.json({ user: null });
    }

    res.json({ user: authUserPayload(user) });
  } catch {
    clearSessionCookies(res);
    res.json({ user: null });
  }
});


// Short-lived Socket.IO handshake token. Keeps JWT out of long-term storage while
// supporting browsers that block cross-site cookies on websocket upgrades.
router.get("/socket-token", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.deletedAt) {
      clearSessionCookies(res);
      return res.status(401).json({ message: "Invalid session" });
    }

    res.json({ socketToken: signAccessToken(user) });
  } catch (error) {
    res.status(401).json({ message: "Unable to create socket token" });
  }
});


// Refresh access token using a HttpOnly refresh cookie
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = getCookie(req, "refreshToken");
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    const decoded = jwt.verify(refreshToken, getJwtSecret("refresh"));
    if (decoded.type && decoded.type !== "refresh") {
      return res.status(401).json({ message: "Invalid token type" });
    }

    const user = await User.findById(decoded.userId).select("+refreshTokenHash");
    if (!user || user.deletedAt) {
      clearSessionCookies(res);
      return res.status(401).json({ message: "Invalid refresh session" });
    }

    if (user.refreshTokenHash !== hashToken(refreshToken)) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      user.refreshTokenHash = null;
      await user.save();
      clearSessionCookies(res);
      return res.status(401).json({ message: "Refresh session was revoked" });
    }

    const accessToken = signAccessToken(user);
    res.cookie("accessToken", accessToken, cookieOptions());
    res.cookie("authToken", accessToken, cookieOptions());
    res.json(buildAuthResponse("Session refreshed", user));
  } catch (error) {
    clearSessionCookies(res);
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

// Email verification token creation/resend
router.post("/resend-verification", authLimiter, auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("+emailVerificationTokenHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) return res.json({ message: "Email is already verified" });

    const token = randomToken();
    user.emailVerificationTokenHash = hashToken(token);
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verifyUrl = `${process.env.FRONTEND_ORIGINS?.split(",")[0] || "http://localhost:5173"}/verify-email?token=${token}`;
    await sendSecurityEmail({
      to: user.email,
      subject: "Verify your ChessPlay account",
      text: `Verify your email: ${verifyUrl}`,
    });

    res.json({ message: "Verification email sent" });
  } catch (error) {
    logger.error("Resend verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/verify-email", authLimiter, async (req, res) => {
  try {
    const token = String(req.body.token || "");
    if (!token) return res.status(400).json({ message: "Verification token is required" });

    const user = await User.findOne({
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationTokenHash");

    if (!user) return res.status(400).json({ message: "Invalid or expired verification token" });

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    logger.error("Verify email error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email }).select("+passwordResetTokenHash");

    // Avoid leaking account existence.
    if (!user) return res.json({ message: "If the account exists, a reset email was sent" });

    const token = randomToken();
    user.passwordResetTokenHash = hashToken(token);
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.FRONTEND_ORIGINS?.split(",")[0] || "http://localhost:5173"}/reset-password?token=${token}`;
    await sendSecurityEmail({
      to: user.email,
      subject: "Reset your ChessPlay password",
      text: `Reset your password: ${resetUrl}`,
    });

    res.json({ message: "If the account exists, a reset email was sent" });
  } catch (error) {
    logger.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/reset-password", authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    const passwordError = validateStrongPassword(password);
    if (passwordError) return res.status(400).json({ message: passwordError });

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash");

    if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

    user.password = password;
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    user.refreshTokenHash = null;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    clearSessionCookies(res);
    res.json({ message: "Password reset successful. Please log in again." });
  } catch (error) {
    logger.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/account", authLimiter, auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("+refreshTokenHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    const anonymized = `deleted-${user._id}@deleted.chessplay.local`;
    user.username = `DeletedUser${String(user._id).slice(-6)}`;
    user.email = anonymized;
    user.bio = "";
    user.avatar = null;
    user.password = randomToken() + "A1";
    user.refreshTokenHash = null;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.deletedAt = new Date();
    await user.save();

    clearSessionCookies(res);
    res.json({ message: "Account deleted" });
  } catch (error) {
    logger.error("Delete account error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get current user profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    logger.error("Profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get specific user profile by ID
router.get("/profile/:userId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(PUBLIC_USER_FIELDS + " bio createdAt gamesLost gamesDrawn puzzleRating highestPuzzleRating puzzlesSolved");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const ownProfile = String(user._id) === String(req.user.userId);
    if (
      !ownProfile &&
      user.privacy?.profileVisibility === false &&
      !isFriend(user, req.user.userId)
    ) {
      return res.status(403).json({ message: "This profile is private" });
    }

    res.json({ user: publicProfile(user) });
  } catch (error) {
    logger.error("Profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Search users for friend discovery
router.get("/users/search", auth, async (req, res) => {
  try {
    const query = String(req.query.q || "")
      .trim()
      .slice(0, MAX_SEARCH_QUERY_LENGTH);
    if (query.length < 2) {
      return res.json({ users: [] });
    }
    const usernamePattern = escapeRegex(query);

    const currentUser = await User.findById(req.user.userId).select(
      "friends friendRequests",
    );
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const users = await User.find({
      _id: { $ne: req.user.userId },
      username: { $regex: usernamePattern, $options: "i" },
    })
      .select(PUBLIC_USER_FIELDS)
      .limit(10);

    const friendIds = new Set(currentUser.friends.map((id) => String(id)));
    const incomingIds = new Set(
      currentUser.friendRequests
        .filter((request) => request.status === "pending")
        .map((request) => String(request.from)),
    );

    const usersWithStatus = (
      await Promise.all(
        users.map(async (candidate) => {
          const candidateId = String(candidate._id);
          const pendingOutgoing = await User.exists({
            _id: candidateId,
            friendRequests: {
              $elemMatch: {
                from: req.user.userId,
                status: "pending",
              },
            },
          });

          const relationship = friendIds.has(candidateId)
            ? "friend"
            : incomingIds.has(candidateId)
              ? "incoming"
              : pendingOutgoing
                ? "pending"
                : "none";

          if (
            candidate.privacy?.profileVisibility === false &&
            relationship !== "friend" &&
            relationship !== "incoming"
          ) {
            return null;
          }

          return publicUser(candidate, relationship);
        }),
      )
    ).filter(Boolean);

    res.json({ users: usersWithStatus });
  } catch (error) {
    logger.error("User search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get friends and pending requests
router.get("/friends", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("friends friendRequests")
      .populate("friends", FRIEND_USER_FIELDS)
      .populate("friendRequests.from", FRIEND_USER_FIELDS);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      friends: user.friends.map((friend) => publicUser(friend, "friend")),
      requests: user.friendRequests
        .filter((request) => request.status === "pending" && request.from)
        .map((request) => ({
          id: request._id,
          from: publicUser(request.from, "incoming"),
          createdAt: request.createdAt,
        })),
    });
  } catch (error) {
    logger.error("Friends load error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Send friend request
router.post("/friends/request", auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || userId === req.user.userId) {
      return res.status(400).json({ message: "Invalid user" });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(req.user.userId),
      User.findById(userId),
    ]);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser.friends.some((friendId) => String(friendId) === String(userId))) {
      return res.status(400).json({ message: "Already friends" });
    }

    if (targetUser.privacy?.friendRequests === false) {
      return res.status(403).json({ message: "This player is not accepting friend requests" });
    }

    const hasPending = targetUser.friendRequests.some(
      (request) =>
        String(request.from) === String(req.user.userId) &&
        request.status === "pending",
    );
    if (!hasPending) {
      targetUser.friendRequests.push({ from: req.user.userId });
      await targetUser.save();
    }

    res.json({ message: "Friend request sent" });
  } catch (error) {
    logger.error("Friend request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Accept or decline friend request
router.post("/friends/respond", auth, async (req, res) => {
  try {
    const { requestId, action } = req.body;
    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const request = user.friendRequests.id(requestId);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ message: "Request not found" });
    }

    if (action === "accept") {
      request.status = "accepted";
      if (!user.friends.some((id) => String(id) === String(request.from))) {
        user.friends.push(request.from);
      }
      await User.findByIdAndUpdate(request.from, {
        $addToSet: { friends: user._id },
      });
    } else {
      request.status = "declined";
    }

    await user.save();
    res.json({ message: action === "accept" ? "Friend added" : "Request declined" });
  } catch (error) {
    logger.error("Friend response error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// Upload or update avatar. Uses Cloudinary when configured; otherwise keeps a safe development fallback.
router.post("/avatar", auth, async (req, res) => {
  try {
    const { imageDataUrl, imageUrl } = req.body || {};
    const stored = await storeAvatar({ imageDataUrl, imageUrl });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { avatar: stored.url },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Avatar updated",
      avatar: user.avatar,
      storage: stored.storage,
    });
  } catch (error) {
    logger.error("Avatar upload error:", error);
    res.status(400).json({ message: error.message || "Avatar upload failed" });
  }
});

router.delete("/avatar", auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { avatar: null },
      { new: true, runValidators: true },
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Avatar removed", user });
  } catch (error) {
    logger.error("Avatar delete error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { username, email, bio, avatar, country, privacy } = req.body;
    const userId = req.user.userId;
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Check if username or email is already taken by another user
    if (username) {
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ message: "Username must be alphanumeric only" });
      }

      const existingUsername = await User.findOne({
        username,
        _id: { $ne: userId }
      });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    if (email) {
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already taken" });
      }
    }

    // Update user
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email.toLowerCase();
    if (bio !== undefined) updateData.bio = sanitizeText(bio, 500);
    if (avatar !== undefined) updateData.avatar = safeExternalImageUrl(avatar) || (String(avatar || "").startsWith("data:image/") ? String(avatar).slice(0, 950000) : null);
    if (country !== undefined) updateData.country = String(country || "US").replace(/[^a-zA-Z -]/g, "").slice(0, 56) || "US";
    if (privacy && typeof privacy === "object") {
      updateData.privacy = {
        profileVisibility: privacy.profileVisibility !== false,
        gameHistory: privacy.gameHistory !== false,
        onlineStatus: privacy.onlineStatus !== false,
        friendRequests: privacy.friendRequests !== false,
        spectatorMode: Boolean(privacy.spectatorMode),
      };
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user
    });
  } catch (error) {
    logger.error("Profile update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Change password
router.put("/password", authLimiter, auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    logger.error("Password update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get leaderboard
router.get("/leaderboard", auth, async (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 10, MAX_LEADERBOARD_LIMIT);

    const users = await User.find({})
      .select("username rating gamesPlayed gamesWon")
      .sort({ rating: -1 })
      .limit(limit);

    res.json(users);
  } catch (error) {
    logger.error("Leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
