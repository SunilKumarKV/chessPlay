const express = require('express');
const auth = require('../middleware/auth');
const { prisma } = require('../src/config/prisma');

const router = express.Router();

function clean(value, max = 1000) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function isAdmin(user) {
  const admins = String(process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((email) => email.trim()).filter(Boolean);
  return String(user?.role || '').toUpperCase() === 'ADMIN' || admins.includes(String(user?.email || '').toLowerCase());
}

async function requireAdmin(req, res, next) {
  const userId = String(req.user?.userId || req.user?.id || '');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt || !isAdmin(user)) return res.status(403).json({ message: 'Admin access required' });
  req.adminUser = user;
  next();
}

function ticketPayload(record) {
  const data = record.data || {};
  return {
    _id: record.id,
    id: record.id,
    user: data.user || null,
    type: data.type || 'general',
    subject: data.subject || '',
    message: data.message || '',
    status: data.status || 'open',
    priority: data.priority || 'normal',
    adminNotes: data.adminNotes || '',
    relatedPaymentReference: data.relatedPaymentReference || '',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function eventPayload(record) {
  const data = record.data || {};
  return {
    _id: record.id,
    id: record.id,
    type: data.type || 'automation_event',
    title: data.title || '',
    message: data.message || '',
    channels: data.channels || [],
    status: data.status || 'queued',
    payload: data.payload || {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

router.get('/status', auth, requireAdmin, async (_req, res) => {
  res.json({
    status: {
      telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID),
      emailConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
      whatsappConfigured: Boolean(process.env.WHATSAPP_WEBHOOK_URL),
      mode: 'prisma-compatibility',
    },
    config: {
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'missing',
      TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID ? 'configured' : 'missing',
      WHATSAPP_WEBHOOK_URL: process.env.WHATSAPP_WEBHOOK_URL ? 'configured' : 'missing',
      SMTP_HOST: process.env.SMTP_HOST ? 'configured' : 'missing',
      SMTP_USER: process.env.SMTP_USER ? 'configured' : 'missing',
      SUPPORT_EMAIL_TO: process.env.SUPPORT_EMAIL_TO ? 'configured' : 'missing',
    },
    supportedFlows: ['payment_submitted', 'payment_approved', 'payment_rejected', 'support_ticket_created', 'refund_requested', 'faq_question'],
  });
});

router.post('/support-ticket', auth, async (req, res) => {
  try {
    const userId = String(req.user?.userId || req.user?.id || '');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) return res.status(401).json({ message: 'Please sign in to continue.' });
    const type = ['general', 'payment', 'refund', 'bug', 'account', 'premium', 'faq'].includes(req.body?.type) ? req.body.type : 'general';
    const subject = clean(req.body?.subject, 120);
    const message = clean(req.body?.message, 2000);
    if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required' });
    const data = {
      user: { id: user.id, username: user.username, email: user.email },
      type,
      subject,
      message,
      relatedPaymentReference: clean(req.body?.relatedPaymentReference, 120),
      priority: type === 'refund' || type === 'payment' ? 'high' : 'normal',
      status: 'open',
    };
    const ticket = await prisma.documentRecord.create({ collection: 'support_tickets', data });
    await prisma.documentRecord.create({
      collection: 'automation_events',
      data: { type: type === 'refund' ? 'refund_requested' : type === 'faq' ? 'faq_question' : 'support_ticket_created', title: 'New support ticket', message: `${user.username} submitted: ${subject}`, status: 'queued', payload: { ticketId: ticket.id, ticketType: type, userEmail: user.email } },
    }).catch(() => {});
    res.status(201).json({ message: 'Support ticket created and admin notification queued', ticket: ticketPayload(ticket) });
  } catch {
    res.status(500).json({ message: 'Could not create support ticket' });
  }
});

router.get('/tickets', auth, requireAdmin, async (req, res) => {
  const status = ['open', 'in_review', 'resolved', 'closed'].includes(req.query.status) ? req.query.status : null;
  const records = await prisma.documentRecord.findMany({ collection: 'support_tickets', orderBy: { createdAt: 'desc' }, take: 100 });
  const tickets = records.map(ticketPayload).filter((ticket) => !status || ticket.status === status);
  res.json({ tickets });
});

router.patch('/tickets/:id', auth, requireAdmin, async (req, res) => {
  const record = await prisma.documentRecord.findUnique({ where: { id: req.params.id } });
  if (!record || record.collection !== 'support_tickets') return res.status(404).json({ message: 'Ticket not found' });
  const current = record.data || {};
  const data = {
    ...current,
    status: ['open', 'in_review', 'resolved', 'closed'].includes(req.body?.status) ? req.body.status : current.status || 'open',
    adminNotes: typeof req.body?.adminNotes === 'string' ? clean(req.body.adminNotes, 1000) : current.adminNotes || '',
  };
  const ticket = await prisma.documentRecord.update({ where: { id: record.id }, data: { data } });
  res.json({ message: 'Ticket updated', ticket: ticketPayload(ticket) });
});

router.get('/events', auth, requireAdmin, async (_req, res) => {
  const records = await prisma.documentRecord.findMany({ collection: 'automation_events', orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ events: records.map(eventPayload) });
});

router.post('/test', auth, requireAdmin, async (req, res) => {
  const event = await prisma.documentRecord.create({
    collection: 'automation_events',
    data: { type: 'bot_test', title: 'Automation test from ChessPlay', message: 'Safe test alert queued in Prisma compatibility mode.', channels: Array.isArray(req.body?.channels) && req.body.channels.length ? req.body.channels : ['telegram', 'email'], status: 'queued', payload: { adminEmail: req.adminUser.email, source: 'admin_automation_page' } },
  });
  res.json({ message: 'Test notification queued', event: eventPayload(event) });
});

module.exports = router;
