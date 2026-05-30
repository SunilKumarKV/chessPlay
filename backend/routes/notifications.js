const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const { prisma } = require("../lib/prisma");
const { validateBody } = require("../middleware/validate");

const router = express.Router();

const deviceTokenLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many device token requests. Please try again later." },
});

const expoTokenPattern = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;
const deviceIdPattern = /^[A-Za-z0-9._:-]{8,128}$/;

const validateRegisterDeviceToken = validateBody({
  token: { required: true, max: 256, pattern: expoTokenPattern },
  platform: { required: true, enum: ["ios", "android"] },
  deviceId: { required: true, max: 128, pattern: deviceIdPattern },
  appVersion: { max: 32, pattern: /^[A-Za-z0-9._+ -]+$/ },
});

const validateDeleteDeviceToken = validateBody({
  token: { max: 256, pattern: expoTokenPattern },
  deviceId: { max: 128, pattern: deviceIdPattern },
});

function requirePrisma(res) {
  if (prisma) return true;
  res.status(503).json({ message: "Database is not configured." });
  return false;
}

router.post("/device-token", auth, deviceTokenLimiter, validateRegisterDeviceToken, async (req, res, next) => {
  try {
    if (!requirePrisma(res)) return;
    const { token, platform, deviceId, appVersion } = req.validatedBody;
    const userId = String(req.user.userId);
    const now = new Date();
    const existing = await prisma.deviceToken.findFirst({
      where: {
        OR: [
          { token },
          { userId, deviceId },
        ],
      },
    });

    const data = {
      userId,
      token,
      platform,
      deviceId,
      appVersion: appVersion || null,
      revokedAt: null,
      lastSeenAt: now,
    };
    const record = existing
      ? await prisma.deviceToken.update({ where: { id: existing.id }, data })
      : await prisma.deviceToken.create({ data });

    res.json({
      message: "Device token registered",
      deviceToken: {
        id: record.id,
        platform: record.platform,
        deviceId: record.deviceId,
        appVersion: record.appVersion,
        lastSeenAt: record.lastSeenAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/device-token", auth, deviceTokenLimiter, validateDeleteDeviceToken, async (req, res, next) => {
  try {
    if (!requirePrisma(res)) return;
    const { token, deviceId } = req.validatedBody;
    const userId = String(req.user.userId);
    const filter = token || deviceId
      ? { userId, OR: [token ? { token } : null, deviceId ? { deviceId } : null].filter(Boolean) }
      : { userId, revokedAt: null };
    const result = await prisma.deviceToken.updateMany({
      where: filter,
      data: { revokedAt: new Date() },
    });
    res.json({ message: "Device token revoked", revoked: result.count });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
