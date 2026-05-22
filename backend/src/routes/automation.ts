// @ts-nocheck
import express from "express";
import auth from "../middleware/auth";
import User from "../models/User";
import SupportTicket from "../models/SupportTicket";
import AutomationEvent from "../models/AutomationEvent";
import { sanitizeText } from "../utils/security";
import { getAutomationStatus, redactSecrets, sendAutomationNotification } from "../utils/automationBot";

const router = express.Router();

function parseAdminEmails() {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select("email isAdmin username");
    const adminEmails = parseAdminEmails();
    if (!user || (!user.isAdmin && !adminEmails.includes(String(user.email).toLowerCase()))) {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.adminUser = user;
    next();
  } catch {
    res.status(500).json({ message: "Admin check failed" });
  }
}

router.get("/status", auth, requireAdmin, async (_req, res) => {
  res.json({
    status: getAutomationStatus(),
    config: redactSecrets({
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID,
      WHATSAPP_WEBHOOK_URL: process.env.WHATSAPP_WEBHOOK_URL,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SUPPORT_EMAIL_TO: process.env.SUPPORT_EMAIL_TO,
    }),
    supportedFlows: [
      "payment_submitted",
      "payment_approved",
      "payment_rejected",
      "support_ticket_created",
      "refund_requested",
      "faq_question",
    ],
  });
});

router.post("/support-ticket", auth, async (req, res) => {
  try {
    const type = ["general", "payment", "refund", "bug", "account", "premium", "faq"].includes(req.body.type) ? req.body.type : "general";
    const subject = sanitizeText(req.body.subject, 120);
    const message = sanitizeText(req.body.message, 2000);
    if (!subject || !message) return res.status(400).json({ message: "Subject and message are required" });

    const ticket = await SupportTicket.create({
      user: req.user.userId,
      type,
      subject,
      message,
      relatedPaymentReference: sanitizeText(req.body.relatedPaymentReference || "", 120),
      priority: type === "refund" || type === "payment" ? "high" : "normal",
    });
    const user = await User.findById(req.user.userId).select("username email");
    await sendAutomationNotification({
      type: type === "refund" ? "refund_requested" : type === "faq" ? "faq_question" : "support_ticket_created",
      user: req.user.userId,
      title: type === "refund" ? "Refund request received" : "New support ticket",
      message: `${user?.username || "User"} submitted: ${subject}`,
      payload: {
        ticketId: String(ticket._id),
        ticketType: type,
        subject,
        userEmail: user?.email,
        relatedPaymentReference: ticket.relatedPaymentReference,
      },
    });
    res.status(201).json({ message: "Support ticket created and admin notification queued", ticket });
  } catch (error) {
    console.error("Support ticket error:", error);
    res.status(500).json({ message: "Could not create support ticket" });
  }
});

router.get("/tickets", auth, requireAdmin, async (req, res) => {
  const status = ["open", "in_review", "resolved", "closed"].includes(req.query.status) ? req.query.status : undefined;
  const tickets = await SupportTicket.find(status ? { status } : {})
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("user", "username email plan isPremium");
  res.json({ tickets });
});

router.patch("/tickets/:id", auth, requireAdmin, async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (["open", "in_review", "resolved", "closed"].includes(req.body.status)) ticket.status = req.body.status;
  if (typeof req.body.adminNotes === "string") ticket.adminNotes = sanitizeText(req.body.adminNotes, 1000);
  await ticket.save();
  res.json({ message: "Ticket updated", ticket });
});

router.get("/events", auth, requireAdmin, async (_req, res) => {
  const events = await AutomationEvent.find().sort({ createdAt: -1 }).limit(100).populate("user", "username email");
  res.json({ events });
});

router.post("/test", auth, requireAdmin, async (req, res) => {
  const event = await sendAutomationNotification({
    type: "bot_test",
    user: req.user.userId,
    title: "Automation test from ChessPlay",
    message: "This is a safe test alert for direct Node.js Telegram and email admin alerts. WhatsApp is kept as a future channel.",
    payload: { adminEmail: req.adminUser.email, source: "admin_automation_page" },
    channels: Array.isArray(req.body.channels) && req.body.channels.length ? req.body.channels : ["telegram", "email"],
  });
  res.json({ message: "Test notification queued", event });
});

export default router;
