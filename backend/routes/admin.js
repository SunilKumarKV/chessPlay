const express = require("express");
const { isValidId } = require("../utils/id");
const User = require("../models/User");
const Game = require("../models/Game");
const SupporterRequest = require("../models/SupporterRequest");
const SupportTicket = require("../models/SupportTicket");
const AdminAuditLog = require("../models/AdminAuditLog");
const AppSetting = require("../models/AppSetting");
const SecurityEvent = require("../models/SecurityEvent");
const CommunityPost = require("../models/CommunityPost");
const Tournament = require("../models/Tournament");
const Referral = require("../models/Referral");
const Feedback = require("../models/Feedback");
const Payment = require("../models/Payment");
const PuzzleDailyUsage = require("../models/PuzzleDailyUsage");
const Subscription = require("../models/Subscription");
const Waitlist = require("../models/Waitlist");
const auth = require("../middleware/auth");
const { sanitizeText, isConfiguredAdminEmail } = require("../utils/security");
const { normalizePlan, planConfig } = require("../config/plans");

const router = express.Router();
const VALID_GAME_STATUS = new Set(["all", "active", "completed", "abandoned", "draw", "checkmate"]);
const VALID_TICKET_STATUS = new Set(["open", "in_review", "resolved", "closed"]);
const VALID_COMMUNITY_STATUS = new Set(["open", "reviewing", "resolved", "closed"]);
const VALID_COMMUNITY_TYPE = new Set(["announcement", "feedback", "bug", "feature", "discussion"]);
const DEFAULT_SETTINGS = {
  maintenanceMode: false,
  supporterPlanVisible: true,
  adsEnabled: true,
  announcementBanner: "",
};

function asBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function isValidObjectId(id) {
  return isValidId(String(id || ""));
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function gameStatusFilter(status) {
  if (status === "active") return { result: "ongoing" };
  if (status === "completed") return { result: { $ne: "ongoing" } };
  if (status === "abandoned") return { result: "ongoing", startTime: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
  if (status === "draw") return { result: "draw" };
  if (status === "checkmate") return { result: /checkmate/i };
  return {};
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    username: user.username || "ChessPlay user",
    email: user.email || "",
    rating: user.rating || 1200,
    gamesPlayed: user.gamesPlayed || 0,
    gamesWon: user.gamesWon || 0,
    gamesLost: user.gamesLost || 0,
    gamesDrawn: user.gamesDrawn || 0,
    isAdmin: Boolean(user.isAdmin) || isConfiguredAdminEmail(user.email),
    isBanned: Boolean(user.isBanned),
    bannedReason: user.bannedReason || "",
    isSupporter: Boolean(user.isSupporter),
    isPremium: Boolean(user.isPremium),
    adsDisabled: Boolean(user.adsDisabled) || Boolean(user.entitlements?.noAds),
    plan: user.plan || "free",
    planStatus: user.planStatus || "active",
    lastLogin: user.lastLogin || null,
    createdAt: user.createdAt || null,
  };
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(`Admin route failed: ${req.method} ${req.originalUrl}`, error.message);
      res.status(500).json({ message: "Unable to load admin data. Please try again." });
    }
  };
}

async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.userId || !isValidObjectId(req.user.userId)) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    const user = await User.findById(req.user.userId).select("email username isAdmin isBanned deletedAt");
    if (!user || user.deletedAt || user.isBanned) {
      await SecurityEvent.create({ type: "admin_denied", user: req.user.userId, ip: req.ip, userAgent: req.headers["user-agent"] || "", reason: "missing_or_banned_user" }).catch(() => {});
      return res.status(403).json({ message: "Admin access required." });
    }

    if (!user.isAdmin && !isConfiguredAdminEmail(user.email)) {
      await SecurityEvent.create({ type: "admin_denied", user: user._id, email: user.email, ip: req.ip, userAgent: req.headers["user-agent"] || "", reason: "not_admin" }).catch(() => {});
      return res.status(403).json({ message: "Admin access required." });
    }

    req.adminUser = user;
    return next();
  } catch (error) {
    console.error("Admin authorization failed:", error.message);
    return res.status(500).json({ message: "Unable to verify admin access. Please try again." });
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

router.get("/health", asyncRoute(async (req, res) => {
  res.json({ ok: true, admin: { id: String(req.adminUser._id), email: req.adminUser.email }, checkedAt: new Date().toISOString() });
}));

router.get("/overview", asyncRoute(async (_req, res) => {
  const activeSince = new Date(Date.now() - 15 * 60 * 1000);
  const abandonedFilter = gameStatusFilter("abandoned");
  const [totalUsers, totalGames, activeUsers, supporterUsers, pendingRequests, openReports, recentGames, suspiciousGames, premiumUsers, revenueAgg, manualRevenueAgg, paymentsCount, puzzleUsageAgg, feedbackReports] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    Game.countDocuments(),
    User.countDocuments({ lastLogin: { $gte: activeSince }, deletedAt: null }),
    User.countDocuments({ isSupporter: true, deletedAt: null }),
    SupporterRequest.countDocuments({ status: "pending" }),
    SupportTicket.countDocuments({ status: { $in: ["open", "in_review"] } }).catch(() => 0),
    Game.find().sort({ startTime: -1 }).limit(5).populate("whitePlayer", "username email").populate("blackPlayer", "username email").lean(),
    Game.countDocuments(abandonedFilter),
    User.countDocuments({ deletedAt: null, $or: [{ isPremium: true }, { isSupporter: true }, { plan: { $in: ["pro", "premium", "lifetime", "supporter_monthly", "supporter_yearly"] } }] }),
    Payment.aggregate([{ $match: { status: "paid", currency: "INR" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]).catch(() => []),
    SupporterRequest.aggregate([{ $match: { status: "approved", currency: "INR" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]).catch(() => []),
    Payment.countDocuments({ status: "paid" }).catch(() => 0),
    PuzzleDailyUsage.aggregate([{ $match: { dateKey: new Date().toISOString().slice(0, 10) } }, { $group: { _id: null, used: { $sum: "$used" } } }]).catch(() => []),
    Feedback.countDocuments({ status: { $in: ["open", "in_review"] } }).catch(() => 0),
  ]);
  const latestReports = await SupportTicket.find().sort({ createdAt: -1 }).limit(5).populate("user", "username email").lean().catch(() => []);
  const revenueInr = (revenueAgg?.[0]?.total || 0) + (manualRevenueAgg?.[0]?.total || 0);
  const puzzleUsageToday = puzzleUsageAgg?.[0]?.used || 0;
  const conversionRate = totalUsers ? Math.round((premiumUsers / totalUsers) * 1000) / 10 : 0;
  res.json({
    stats: { totalUsers, totalGames, activeUsers, supporterUsers, pendingRequests, openReports, latestReports: latestReports.length, suspiciousGames, premiumUsers, revenueInr, paymentsCount, puzzleUsageToday, feedbackReports, conversionRate },
    latestReports,
    recentGames,
  });
}));

router.get("/revenue", asyncRoute(async (_req, res) => {
  const activePlans = ["pro", "premium", "lifetime", "supporter_monthly", "supporter_yearly"];
  const [totalUsers, premiumUsers, paymentsCount, revenueAgg, activeSubscriptions, puzzleUsageAgg] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    User.countDocuments({ deletedAt: null, $or: [{ isPremium: true }, { isSupporter: true }, { plan: { $in: activePlans } }] }),
    Payment.countDocuments({ status: "paid" }).catch(() => 0),
    Payment.aggregate([{ $match: { status: "paid", currency: "INR" } }, { $group: { _id: "$plan", total: { $sum: "$amount" }, count: { $sum: 1 } } }]).catch(() => []),
    Subscription.find({ status: { $in: ["active", "trialing"] } }).select("plan status currentPeriodEnd").lean().catch(() => []),
    PuzzleDailyUsage.aggregate([{ $group: { _id: "$plan", used: { $sum: "$used" }, days: { $sum: 1 } } }]).catch(() => []),
  ]);
  const revenueInr = revenueAgg.reduce((sum, row) => sum + (row.total || 0), 0);
  const mrrEstimate = activeSubscriptions.reduce((sum, sub) => {
    const config = planConfig(sub.plan);
    if (normalizePlan(sub.plan) === "lifetime") return sum;
    return sum + (config.amountInr || 0);
  }, 0);
  res.json({
    totalUsers,
    premiumUsers,
    payments: { count: paymentsCount, revenueInr, byPlan: revenueAgg },
    mrrEstimate,
    puzzleUsage: puzzleUsageAgg,
    conversionRate: totalUsers ? Math.round((premiumUsers / totalUsers) * 1000) / 10 : 0,
  });
}));

router.get("/users", asyncRoute(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const type = String(req.query.type || "all");
  const filter = { deletedAt: null };
  if (q) {
    const pattern = escapeRegex(q);
    filter.$or = [{ email: { $regex: pattern, $options: "i" } }, { username: { $regex: pattern, $options: "i" } }];
  }
  if (type === "admins") filter.isAdmin = true;
  if (type === "supporters") filter.isSupporter = true;
  if (type === "banned") filter.isBanned = true;
  if (type === "free") filter.plan = "free";
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(100).select("username email rating gamesPlayed gamesWon gamesLost gamesDrawn isAdmin isBanned bannedReason isSupporter isPremium adsDisabled plan planStatus lastLogin createdAt entitlements");
  res.json({ users: users.map(safeUser) });
}));

router.get("/users/:id", asyncRoute(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid user id." });
  const user = await User.findById(req.params.id).select("username email rating gamesPlayed gamesWon gamesLost gamesDrawn isAdmin isBanned bannedReason isSupporter isPremium adsDisabled plan planStatus lastLogin createdAt entitlements");
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ user: safeUser(user) });
}));

router.get("/users/:id/games", asyncRoute(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid user id." });
  const games = await Game.find({ $or: [{ whitePlayer: req.params.id }, { blackPlayer: req.params.id }] })
    .sort({ startTime: -1 })
    .limit(50)
    .populate("whitePlayer", "username email")
    .populate("blackPlayer", "username email")
    .populate("winner", "username email")
    .lean();
  res.json({ games });
}));

router.patch("/users/:id/admin", asyncRoute(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid user id." });
  const nextAdmin = asBoolean(req.body.isAdmin);
  if (String(req.params.id) === String(req.adminUser._id) && nextAdmin === false) {
    return res.status(409).json({ message: "You cannot remove your own admin access." });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  user.isAdmin = nextAdmin;
  await user.save();
  await writeAudit(req, user.isAdmin ? "admin_promoted" : "admin_demoted", "User", user._id, { email: user.email });
  res.json({ message: "User updated successfully.", user: safeUser(user) });
}));

router.patch("/users/:id/ban", asyncRoute(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid user id." });
  if (String(req.params.id) === String(req.adminUser._id)) return res.status(409).json({ message: "You cannot ban your own account." });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  const banned = asBoolean(req.body.isBanned);
  user.isBanned = banned;
  user.bannedAt = banned ? new Date() : null;
  user.bannedReason = banned ? sanitizeText(req.body.reason || "Policy violation", 300) : "";
  if (banned) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.refreshTokenHash = null;
  }
  await user.save();
  await writeAudit(req, banned ? "user_banned" : "user_unbanned", "User", user._id, { email: user.email, reason: user.bannedReason });
  res.json({ message: banned ? "User banned successfully." : "User unbanned successfully.", user: safeUser(user) });
}));

router.get("/users/:id/subscription", asyncRoute(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid user id." });
  const [user, subscriptions, payments] = await Promise.all([
    User.findById(req.params.id).select("username email plan planStatus planStartedAt planExpiresAt isSupporter isPremium supporterPlan supporterExpiresAt entitlements"),
    Subscription.find({ user: req.params.id }).sort({ createdAt: -1 }).limit(20),
    Payment.find({ user: req.params.id }).sort({ createdAt: -1 }).limit(20).select("-raw"),
  ]);
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ user: safeUser(user), subscription: { plan: user.plan, status: user.planStatus, startedAt: user.planStartedAt, expiresAt: user.planExpiresAt, entitlements: user.entitlements }, subscriptions, payments });
}));

router.patch("/users/:id/subscription", asyncRoute(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid user id." });
  const plan = normalizePlan(req.body.plan);
  const status = ["active", "expired", "pending", "cancelled"].includes(req.body.status) ? req.body.status : "active";
  const config = planConfig(plan);
  const now = new Date();
  const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : plan === "free" ? null : new Date(now.getTime() + config.durationDays * 24 * 60 * 60 * 1000);
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return res.status(400).json({ message: "Invalid expiry date." });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  user.plan = plan;
  user.planStatus = status;
  user.planStartedAt = status === "active" ? now : user.planStartedAt;
  user.planExpiresAt = expiresAt;
  user.isPremium = plan !== "free" && status === "active";
  user.isSupporter = plan !== "free" && status === "active";
  user.supporterPlan = plan === "free" ? "none" : plan;
  user.supporterExpiresAt = expiresAt;
  user.adsDisabled = Boolean(config.entitlements.noAds);
  user.entitlements = status === "active" ? config.entitlements : {};
  await user.save();
  await Subscription.create({ user: user._id, plan, status: status === "active" ? "active" : status, provider: "admin", currentPeriodStart: now, currentPeriodEnd: expiresAt, metadata: { changedBy: req.adminUser._id, note: sanitizeText(req.body.note || "", 500) } }).catch(() => {});
  await writeAudit(req, "subscription_admin_updated", "User", user._id, { plan, status, expiresAt, note: sanitizeText(req.body.note || "", 500) });
  res.json({ message: "User subscription updated.", user: safeUser(user) });
}));

router.get("/payments", asyncRoute(async (req, res) => {
  const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : undefined;
  const q = String(req.query.q || "").trim();
  const method = ["upi", "bank", "paypal"].includes(req.query.method) ? req.query.method : undefined;
  const filter = {};
  if (status) filter.status = status;
  if (method) filter.paymentMethod = method;
  if (q) {
    const pattern = escapeRegex(q);
    filter.$or = [
      { utr: { $regex: pattern, $options: "i" } },
      { bankReference: { $regex: pattern, $options: "i" } },
      { providerReference: { $regex: pattern, $options: "i" } },
      { payerEmail: { $regex: pattern, $options: "i" } },
    ];
  }
  const requests = await SupporterRequest.find(filter).sort({ createdAt: -1 }).limit(100)
    .populate("user", "username email rating plan planStatus isSupporter isPremium supporterExpiresAt coins adsDisabled")
    .populate("reviewedBy", "username email")
    .lean();
  res.json({ requests });
}));

router.get("/games", asyncRoute(async (req, res) => {
  const status = VALID_GAME_STATUS.has(req.query.status) ? req.query.status : "all";
  const games = await Game.find(gameStatusFilter(status)).sort({ startTime: -1 }).limit(100)
    .populate("whitePlayer", "username email")
    .populate("blackPlayer", "username email")
    .populate("winner", "username email")
    .lean();
  res.json({ games });
}));

router.patch("/games/:id/review", asyncRoute(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid game id." });
  await writeAudit(req, "game_reviewed", "Game", req.params.id, { note: sanitizeText(req.body.note || "Marked reviewed", 500) });
  res.json({ message: "Game review note saved." });
}));

router.get("/feedback", asyncRoute(async (req, res) => {
  const status = VALID_TICKET_STATUS.has(req.query.status) ? req.query.status : undefined;
  const [supportTickets, productFeedback] = await Promise.all([
    SupportTicket.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(100).populate("user", "username email plan isPremium").lean().catch(() => []),
    Feedback.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(100).populate("user", "username email plan isPremium").lean().catch(() => []),
  ]);
  const tickets = [
    ...supportTickets.map((ticket) => ({ ...ticket, source: "support" })),
    ...productFeedback.map((ticket) => ({ ...ticket, subject: `${ticket.category} feedback`, type: ticket.category, source: "feedback" })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100);
  res.json({ tickets });
}));

router.patch("/feedback/:id", asyncRoute(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid feedback id." });
  const ticket = await SupportTicket.findById(req.params.id) || await Feedback.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: "Feedback ticket not found." });
  if (VALID_TICKET_STATUS.has(req.body.status)) ticket.status = req.body.status;
  if (typeof req.body.adminNotes === "string") ticket.adminNotes = sanitizeText(req.body.adminNotes, 1000);
  await ticket.save();
  await writeAudit(req, "feedback_status_updated", "SupportTicket", ticket._id, { status: ticket.status });
  res.json({ message: "Feedback updated successfully.", ticket });
}));

router.delete("/feedback/:id", asyncRoute(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid feedback id." });
  const ticket = await SupportTicket.findByIdAndDelete(req.params.id) || await Feedback.findByIdAndDelete(req.params.id);
  if (!ticket) return res.status(404).json({ message: "Feedback ticket not found." });
  await writeAudit(req, "feedback_deleted", ticket.constructor?.modelName || "Feedback", ticket._id, {});
  res.json({ message: "Feedback deleted." });
}));

router.get("/waitlist", asyncRoute(async (req, res) => {
  const interest = sanitizeText(req.query.interest || "", 60);
  const filter = interest ? { interest } : {};
  const rows = await Waitlist.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ waitlist: rows });
}));

router.get("/waitlist/export", asyncRoute(async (_req, res) => {
  const rows = await Waitlist.find().sort({ createdAt: -1 }).limit(5000).lean();
  res.json({
    count: rows.length,
    csv: ["email,source,interest,createdAt", ...rows.map((row) => [row.email, row.source, row.interest, row.createdAt?.toISOString?.() || ""].map((value) => `"${String(value || "").replace(/"/g, '""')}"`).join(","))].join("\n"),
  });
}));

router.get("/community", asyncRoute(async (req, res) => {
  const type = VALID_COMMUNITY_TYPE.has(req.query.type) ? req.query.type : undefined;
  const status = VALID_COMMUNITY_STATUS.has(req.query.status) ? req.query.status : undefined;
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  const posts = await CommunityPost.find(filter).sort({ createdAt: -1 }).limit(100).populate("author", "username email isSupporter").lean();
  res.json({ posts });
}));

router.patch("/community/:id/status", asyncRoute(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid community post id." });
  const post = await CommunityPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Community post not found." });
  if (!VALID_COMMUNITY_STATUS.has(req.body.status)) return res.status(400).json({ message: "Invalid status." });
  post.status = req.body.status;
  await post.save();
  await writeAudit(req, "community_status_updated", "CommunityPost", post._id, { status: post.status });
  res.json({ message: "Community post updated successfully.", post });
}));

router.get("/tournaments", asyncRoute(async (req, res) => {
  const status = ["draft", "upcoming", "open", "active", "completed", "cancelled"].includes(req.query.status) ? req.query.status : undefined;
  const tournaments = await Tournament.find(status ? { status } : {}).sort({ startsAt: -1 }).limit(100).populate("createdBy", "username email").lean();
  res.json({ tournaments });
}));

router.get("/referrals", asyncRoute(async (req, res) => {
  const status = ["created", "joined", "verified", "reward_eligible", "rewarded", "rejected"].includes(req.query.status) ? req.query.status : undefined;
  const referrals = await Referral.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(100).populate("referrer", "username email isSupporter").populate("referred", "username email isSupporter").lean();
  res.json({ referrals });
}));

router.get("/audit-logs", asyncRoute(async (_req, res) => {
  const logs = await AdminAuditLog.find().sort({ createdAt: -1 }).limit(100).populate("actor", "username email").lean();
  res.json({ logs });
}));

router.get("/settings", asyncRoute(async (_req, res) => {
  res.json({ settings: await getSettingsDocument() });
}));

router.patch("/settings", asyncRoute(async (req, res) => {
  const current = await getSettingsDocument();
  const next = {
    maintenanceMode: typeof req.body.maintenanceMode === "undefined" ? current.maintenanceMode : asBoolean(req.body.maintenanceMode),
    supporterPlanVisible: typeof req.body.supporterPlanVisible === "undefined" ? current.supporterPlanVisible : asBoolean(req.body.supporterPlanVisible),
    adsEnabled: typeof req.body.adsEnabled === "undefined" ? current.adsEnabled : asBoolean(req.body.adsEnabled),
    announcementBanner: typeof req.body.announcementBanner === "undefined" ? current.announcementBanner : sanitizeText(req.body.announcementBanner, 180),
  };
  await AppSetting.findOneAndUpdate({ key: "public_app_settings" }, { value: next, updatedBy: req.adminUser._id }, { upsert: true, new: true });
  await writeAudit(req, "settings_updated", "AppSetting", "public_app_settings", next);
  res.json({ message: "Settings updated successfully.", settings: next });
}));

router.get("/security", asyncRoute(async (_req, res) => {
  const [events, suspiciousIps, adminLogins] = await Promise.all([
    SecurityEvent.find().sort({ createdAt: -1 }).limit(100).populate("user", "username email").lean(),
    SecurityEvent.aggregate([
      { $match: { type: "login_failed", createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, ip: { $ne: "" } } },
      { $group: { _id: "$ip", failures: { $sum: 1 }, lastSeen: { $max: "$createdAt" } } },
      { $match: { failures: { $gte: 3 } } },
      { $sort: { failures: -1 } },
      { $limit: 20 },
    ]),
    SecurityEvent.find({ type: "admin_login" }).sort({ createdAt: -1 }).limit(25).populate("user", "username email").lean(),
  ]);
  res.json({ events, suspiciousIps, adminLogins });
}));

module.exports = router;
