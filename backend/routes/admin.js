const express = require("express");
const User = require("../models/User");
const Game = require("../models/Game");
const SupporterRequest = require("../models/SupporterRequest");
const SupportTicket = require("../models/SupportTicket");
const AdminAuditLog = require("../models/AdminAuditLog");
const AppSetting = require("../models/AppSetting");
const SecurityEvent = require("../models/SecurityEvent");
const auth = require("../middleware/auth");
const { sanitizeText, isConfiguredAdminEmail } = require("../utils/security");

const router = express.Router();
const VALID_GAME_STATUS = new Set(["active", "completed", "abandoned"]);
const DEFAULT_SETTINGS = {
  maintenanceMode: false,
  supporterPlanVisible: true,
  adsEnabled: true,
  announcementBanner: "",
};

function asBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function gameStatusFilter(status) {
  if (status === "active") return { result: "ongoing" };
  if (status === "completed") return { result: { $ne: "ongoing" } };
  if (status === "abandoned") return { result: "ongoing", startTime: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
  return {};
}

function safeUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    rating: user.rating,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    isAdmin: Boolean(user.isAdmin) || isConfiguredAdminEmail(user.email),
    isBanned: Boolean(user.isBanned),
    bannedReason: user.bannedReason || "",
    isSupporter: Boolean(user.isSupporter),
    isPremium: Boolean(user.isPremium),
    adsDisabled: Boolean(user.adsDisabled),
    plan: user.plan || "free",
    planStatus: user.planStatus || "active",
    lastLogin: user.lastLogin || null,
    createdAt: user.createdAt,
  };
}

async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select("email username isAdmin isBanned");
    if (!user || user.isBanned) {
      await SecurityEvent.create({ type: "admin_denied", user: req.user.userId, ip: req.ip, userAgent: req.headers["user-agent"] || "", reason: "missing_or_banned_user" }).catch(() => {});
      return res.status(403).json({ message: "Admin access required" });
    }
    if (!user.isAdmin && !isConfiguredAdminEmail(user.email)) {
      await SecurityEvent.create({ type: "admin_denied", user: user._id, email: user.email, ip: req.ip, userAgent: req.headers["user-agent"] || "", reason: "not_admin" }).catch(() => {});
      return res.status(403).json({ message: "Admin access required" });
    }
    req.adminUser = user;
    next();
  } catch {
    res.status(500).json({ message: "Admin check failed" });
  }
}

async function writeAudit(req, action, targetType, targetId, details = {}) {
  await AdminAuditLog.create({
    actor: req.adminUser?._id || req.user?.userId || null,
    action,
    targetType,
    targetId: String(targetId),
    details,
    ip: req.ip,
    userAgent: req.headers["user-agent"] || "",
  }).catch(() => {});
}

async function getSettingsDocument() {
  const doc = await AppSetting.findOneAndUpdate(
    { key: "public_app_settings" },
    { $setOnInsert: { value: DEFAULT_SETTINGS } },
    { upsert: true, new: true },
  );
  return { ...DEFAULT_SETTINGS, ...(doc.value || {}) };
}

router.use(auth, requireAdmin);

router.get("/overview", async (_req, res) => {
  const activeSince = new Date(Date.now() - 15 * 60 * 1000);
  const abandonedFilter = gameStatusFilter("abandoned");
  const [totalUsers, totalGames, activeUsers, pendingRequests, latestReports, recentGames, suspiciousGames] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    Game.countDocuments(),
    User.countDocuments({ lastLogin: { $gte: activeSince }, deletedAt: null }),
    SupporterRequest.countDocuments({ status: "pending" }),
    SupportTicket.find().sort({ createdAt: -1 }).limit(5).populate("user", "username email"),
    Game.find().sort({ startTime: -1 }).limit(5).populate("whitePlayer", "username email").populate("blackPlayer", "username email"),
    Game.countDocuments(abandonedFilter),
  ]);
  res.json({
    stats: { totalUsers, totalGames, activeUsers, pendingRequests, latestReports: latestReports.length, suspiciousGames },
    latestReports,
    recentGames,
  });
});

router.get("/users", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const filter = { deletedAt: null };
  if (q) {
    const pattern = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ email: { $regex: pattern, $options: "i" } }, { username: { $regex: pattern, $options: "i" } }];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(100).select("username email rating gamesPlayed gamesWon isAdmin isBanned bannedReason isSupporter isPremium adsDisabled plan planStatus lastLogin createdAt");
  res.json({ users: users.map(safeUser) });
});

router.get("/users/:id/games", async (req, res) => {
  const games = await Game.find({ $or: [{ whitePlayer: req.params.id }, { blackPlayer: req.params.id }] })
    .sort({ startTime: -1 })
    .limit(50)
    .populate("whitePlayer", "username email")
    .populate("blackPlayer", "username email")
    .populate("winner", "username email");
  res.json({ games });
});

router.patch("/users/:id/admin", async (req, res) => {
  if (String(req.params.id) === String(req.adminUser._id) && asBoolean(req.body.isAdmin) === false) {
    return res.status(409).json({ message: "You cannot remove your own admin access" });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.isAdmin = asBoolean(req.body.isAdmin);
  await user.save();
  await writeAudit(req, user.isAdmin ? "user.admin.promoted" : "user.admin.demoted", "User", user._id, { email: user.email });
  res.json({ message: "User updated successfully.", user: safeUser(user) });
});

router.patch("/users/:id/ban", async (req, res) => {
  if (String(req.params.id) === String(req.adminUser._id)) return res.status(409).json({ message: "You cannot ban your own account" });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const banned = asBoolean(req.body.isBanned);
  user.isBanned = banned;
  user.bannedAt = banned ? new Date() : null;
  user.bannedReason = banned ? sanitizeText(req.body.reason || "Policy violation", 300) : "";
  if (banned) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.refreshTokenHash = null;
  }
  await user.save();
  await writeAudit(req, banned ? "user.banned" : "user.unbanned", "User", user._id, { email: user.email, reason: user.bannedReason });
  res.json({ message: banned ? "User banned successfully." : "User unbanned successfully.", user: safeUser(user) });
});

router.get("/payments", async (req, res) => {
  const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : undefined;
  const filter = status ? { status } : {};
  const requests = await SupporterRequest.find(filter).sort({ createdAt: -1 }).limit(100).populate("user", "username email rating plan planStatus isSupporter isPremium supporterExpiresAt coins adsDisabled").populate("reviewedBy", "username email");
  res.json({ requests });
});

router.patch("/payments/:id/approve", async (req, res) => {
  req.url = `/admin/requests/${req.params.id}/approve`;
  res.status(409).json({ message: "Use /api/billing/admin/requests/:id/approve for plan approval." });
});

router.get("/games", async (req, res) => {
  const status = VALID_GAME_STATUS.has(req.query.status) ? req.query.status : "all";
  const games = await Game.find(gameStatusFilter(status)).sort({ startTime: -1 }).limit(100).populate("whitePlayer", "username email").populate("blackPlayer", "username email").populate("winner", "username email");
  res.json({ games });
});

router.patch("/games/:id/review", async (req, res) => {
  await writeAudit(req, "game.reviewed", "Game", req.params.id, { note: sanitizeText(req.body.note || "Marked reviewed", 500) });
  res.json({ message: "Game review note saved." });
});

router.get("/feedback", async (req, res) => {
  const status = ["open", "in_review", "resolved", "closed"].includes(req.query.status) ? req.query.status : undefined;
  const tickets = await SupportTicket.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(100).populate("user", "username email plan isPremium");
  res.json({ tickets });
});

router.patch("/feedback/:id", async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: "Feedback ticket not found" });
  if (["open", "in_review", "resolved", "closed"].includes(req.body.status)) ticket.status = req.body.status;
  if (typeof req.body.adminNotes === "string") ticket.adminNotes = sanitizeText(req.body.adminNotes, 1000);
  await ticket.save();
  await writeAudit(req, "feedback.updated", "SupportTicket", ticket._id, { status: ticket.status });
  res.json({ message: "Feedback updated successfully.", ticket });
});

router.get("/audit-logs", async (_req, res) => {
  const logs = await AdminAuditLog.find().sort({ createdAt: -1 }).limit(100).populate("actor", "username email");
  res.json({ logs });
});

router.get("/settings", async (_req, res) => {
  res.json({ settings: await getSettingsDocument() });
});

router.patch("/settings", async (req, res) => {
  const current = await getSettingsDocument();
  const next = {
    maintenanceMode: typeof req.body.maintenanceMode === "undefined" ? current.maintenanceMode : asBoolean(req.body.maintenanceMode),
    supporterPlanVisible: typeof req.body.supporterPlanVisible === "undefined" ? current.supporterPlanVisible : asBoolean(req.body.supporterPlanVisible),
    adsEnabled: typeof req.body.adsEnabled === "undefined" ? current.adsEnabled : asBoolean(req.body.adsEnabled),
    announcementBanner: typeof req.body.announcementBanner === "undefined" ? current.announcementBanner : sanitizeText(req.body.announcementBanner, 180),
  };
  await AppSetting.findOneAndUpdate({ key: "public_app_settings" }, { value: next, updatedBy: req.adminUser._id }, { upsert: true, new: true });
  await writeAudit(req, "app.settings.updated", "AppSetting", "public_app_settings", next);
  res.json({ message: "Settings updated successfully.", settings: next });
});

router.get("/security", async (_req, res) => {
  const [events, suspiciousIps, adminLogins] = await Promise.all([
    SecurityEvent.find().sort({ createdAt: -1 }).limit(100).populate("user", "username email"),
    SecurityEvent.aggregate([
      { $match: { type: "login_failed", createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, ip: { $ne: "" } } },
      { $group: { _id: "$ip", failures: { $sum: 1 }, lastSeen: { $max: "$createdAt" } } },
      { $match: { failures: { $gte: 3 } } },
      { $sort: { failures: -1 } },
      { $limit: 20 },
    ]),
    SecurityEvent.find({ type: "admin_login" }).sort({ createdAt: -1 }).limit(25).populate("user", "username email"),
  ]);
  res.json({ events, suspiciousIps, adminLogins });
});

module.exports = router;
