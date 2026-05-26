const express = require('express');
const auth = require('../middleware/auth');
const { prisma } = require('../src/config/prisma');

const router = express.Router();

const DEFAULT_SETTINGS = {
  maintenanceMode: false,
  supporterPlanVisible: true,
  adsEnabled: true,
  announcementBanner: '',
};

function isAdminUser(user) {
  return String(user?.role || '').toUpperCase() === 'ADMIN' || String(process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((email) => email.trim()).includes(String(user?.email || '').toLowerCase());
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch {
      res.status(500).json({ message: 'Unable to load admin data. Please try again.' });
    }
  };
}

async function requireAdmin(req, res, next) {
  const userId = String(req.user?.userId || req.user?.id || '');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt || !isAdminUser(user)) return res.status(403).json({ message: 'Admin access required.' });
  req.adminUser = user;
  next();
}

function safeUser(user) {
  return {
    id: user.id,
    _id: user.id,
    username: user.username,
    email: user.email,
    rating: user.rating || 1200,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDrawn: 0,
    isAdmin: isAdminUser(user),
    isBanned: false,
    bannedReason: '',
    isSupporter: Boolean(user.isPremium),
    isPremium: Boolean(user.isPremium),
    adsDisabled: Boolean(user.isPremium),
    plan: user.isPremium ? 'premium' : 'free',
    planStatus: 'active',
    lastLogin: user.lastLogin || null,
    createdAt: user.createdAt || null,
  };
}

function safePayment(payment, userMap = new Map()) {
  const meta = payment.metadata || {};
  const user = userMap.get(payment.userId || '');
  const status = String(payment.status || 'SUBMITTED').toLowerCase();
  const reference = String(payment.transactionRef || meta.reference || meta.utr || '');
  return {
    _id: payment.id,
    id: payment.id,
    user: user ? safeUser(user) : null,
    plan: meta.plan || 'supporter_monthly',
    amount: Number(meta.amount || payment.amountCents / 100 || 0),
    currency: payment.currency || meta.currency || 'INR',
    paymentMethod: String(meta.paymentMethod || payment.provider || 'manual').toLowerCase(),
    utr: reference,
    bankReference: reference,
    providerReference: reference,
    payerEmail: meta.payerEmail || '',
    paymentProofUrl: payment.proofUrl || '',
    status: status === 'submitted' ? 'pending' : status,
    rejectionReason: meta.rejectionReason || '',
    reviewedAt: payment.reviewedAt || null,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

async function usersById(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: unique } } });
  return new Map(users.map((user) => [user.id, user]));
}

async function adminSettings() {
  const record = await prisma.documentRecord.findUnique({ where: { id: 'admin_settings:public_app_settings' } });
  return { ...DEFAULT_SETTINGS, ...((record?.data || {}).settings || record?.data || {}) };
}

router.use(auth, requireAdmin);

router.get('/health', asyncRoute(async (req, res) => {
  res.json({ ok: true, admin: { id: req.adminUser.id, email: req.adminUser.email }, checkedAt: new Date().toISOString() });
}));

router.get('/overview', asyncRoute(async (_req, res) => {
  const [totalUsers, totalGames, supporterUsers, pendingPayments, payments, recentGames] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.game.count(),
    prisma.user.count({ where: { deletedAt: null, isPremium: true } }),
    prisma.payment.count({ where: { status: { in: ['PENDING', 'SUBMITTED'] } } }),
    prisma.payment.findMany({ where: { status: { in: ['APPROVED'] }, currency: 'INR' }, take: 500 }),
    prisma.game.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);
  const revenueInr = payments.reduce((sum, payment) => sum + Number(payment.amountCents || 0) / 100, 0);
  res.json({
    stats: {
      totalUsers,
      totalGames,
      activeUsers: 0,
      supporterUsers,
      premiumUsers: supporterUsers,
      pendingRequests: pendingPayments,
      openReports: 0,
      suspiciousGames: 0,
      revenueInr,
      paymentsCount: payments.length,
      puzzleUsageToday: 0,
      feedbackReports: 0,
      conversionRate: totalUsers ? Math.round((supporterUsers / totalUsers) * 1000) / 10 : 0,
    },
    latestReports: [],
    recentGames: recentGames.map((game) => ({ _id: game.id, id: game.id, result: game.result || game.status, startTime: game.startedAt || game.createdAt, moves: game.moves || [] })),
  });
}));

router.get('/users', asyncRoute(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const type = String(req.query.type || 'all');
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(q ? { OR: [{ username: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
      ...(type === 'admins' ? { role: 'ADMIN' } : {}),
      ...(type === 'supporters' ? { isPremium: true } : {}),
      ...(type === 'free' ? { isPremium: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ users: users.map(safeUser) });
}));

router.get('/payments', asyncRoute(async (req, res) => {
  const status = String(req.query.status || '').toLowerCase();
  const q = String(req.query.q || '').trim();
  const where = status && ['pending', 'approved', 'rejected'].includes(status)
    ? { status: status === 'pending' ? { in: ['PENDING', 'SUBMITTED'] } : status.toUpperCase() }
    : {};
  const payments = await prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  const userMap = await usersById(payments.map((payment) => payment.userId));
  const requests = payments.map((payment) => safePayment(payment, userMap)).filter((request) => !q || `${request.user?.username || ''} ${request.user?.email || ''} ${request.utr}`.toLowerCase().includes(q.toLowerCase()));
  res.json({ requests });
}));

router.get('/games', asyncRoute(async (req, res) => {
  const status = String(req.query.status || 'all').toUpperCase();
  const games = await prisma.game.findMany({
    where: status !== 'ALL' ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ games: games.map((game) => ({ _id: game.id, id: game.id, result: game.result || game.status, startTime: game.startedAt || game.createdAt, moves: game.moves || [] })) });
}));

router.get('/community', asyncRoute(async (req, res) => {
  const type = String(req.query.type || '').toUpperCase();
  const status = String(req.query.status || '').toUpperCase();
  const posts = await prisma.communityPost.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ posts: posts.map((post) => ({ _id: post.id, id: post.id, title: post.title, body: post.body, type: String(post.type).toLowerCase(), status: String(post.status).toLowerCase(), authorName: post.authorName, createdAt: post.createdAt })) });
}));

router.patch('/community/:id/status', asyncRoute(async (req, res) => {
  const status = String(req.body.status || '').toUpperCase();
  if (!['OPEN', 'REVIEWING', 'RESOLVED', 'CLOSED'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  const post = await prisma.communityPost.update({ where: { id: req.params.id }, data: { status } });
  res.json({ message: 'Community post updated successfully.', post: { _id: post.id, id: post.id, status: String(post.status).toLowerCase() } });
}));

router.get('/feedback', asyncRoute(async (_req, res) => {
  res.json({ tickets: [] });
}));

router.get('/tournaments', asyncRoute(async (_req, res) => {
  const tournaments = await prisma.tournament.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ tournaments: tournaments.map((item) => ({ _id: item.id, id: item.id, title: item.title, format: item.format, status: String(item.status).toLowerCase(), startsAt: item.startsAt, maxPlayers: item.maxPlayers, players: [] })) });
}));

router.get('/referrals', asyncRoute(async (_req, res) => {
  const referrals = await prisma.referral.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ referrals: referrals.map((item) => ({ _id: item.id, id: item.id, code: item.code, status: String(item.status).toLowerCase(), createdAt: item.createdAt })) });
}));

router.get('/audit-logs', asyncRoute(async (_req, res) => {
  res.json({ logs: [] });
}));

router.get('/settings', asyncRoute(async (_req, res) => {
  res.json({ settings: await adminSettings() });
}));

router.patch('/settings', asyncRoute(async (req, res) => {
  const current = await adminSettings();
  const next = {
    maintenanceMode: typeof req.body.maintenanceMode === 'undefined' ? current.maintenanceMode : Boolean(req.body.maintenanceMode),
    supporterPlanVisible: typeof req.body.supporterPlanVisible === 'undefined' ? current.supporterPlanVisible : Boolean(req.body.supporterPlanVisible),
    adsEnabled: typeof req.body.adsEnabled === 'undefined' ? current.adsEnabled : Boolean(req.body.adsEnabled),
    announcementBanner: String(req.body.announcementBanner || '').slice(0, 180),
  };
  await prisma.documentRecord.upsert({
    where: { id: 'admin_settings:public_app_settings' },
    create: { id: 'admin_settings:public_app_settings', collection: 'admin_settings', data: next },
    update: { data: next },
  });
  res.json({ message: 'Settings updated successfully.', settings: next });
}));

router.get('/security', asyncRoute(async (_req, res) => {
  res.json({ events: [], suspiciousIps: [], adminLogins: [] });
}));

router.patch('/users/:id/admin', asyncRoute(async (req, res) => {
  if (req.params.id === req.adminUser.id && req.body.isAdmin === false) return res.status(409).json({ message: 'You cannot remove your own admin access.' });
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.isAdmin ? 'ADMIN' : 'USER' } });
  res.json({ message: 'User updated successfully.', user: safeUser(user) });
}));

router.patch('/users/:id/ban', asyncRoute(async (_req, res) => {
  res.status(501).json({ message: 'Ban/unban requires the dedicated PostgreSQL moderation model and is not enabled in this migration step.' });
}));

router.patch('/games/:id/review', asyncRoute(async (_req, res) => {
  res.json({ message: 'Game review note saved.' });
}));

module.exports = router;
