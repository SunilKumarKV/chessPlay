// @ts-nocheck
import nodemailer from "nodemailer";
import AutomationEvent from "../models/AutomationEvent";

function enabled(value) {
  return String(value || "").trim().length > 0;
}

function getAutomationStatus() {
  return {
    telegram: enabled(process.env.TELEGRAM_BOT_TOKEN) && enabled(process.env.TELEGRAM_ADMIN_CHAT_ID),
    email: enabled(process.env.SMTP_HOST) && enabled(process.env.SMTP_USER) && enabled(process.env.SMTP_PASS) && enabled(process.env.SUPPORT_EMAIL_TO),
    whatsapp: enabled(process.env.WHATSAPP_PROVIDER) && (enabled(process.env.TWILIO_ACCOUNT_SID) || enabled(process.env.META_WHATSAPP_TOKEN)),
  };
}

function redactSecrets(config = {}) {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, enabled(value) ? "configured" : "missing"]),
  );
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function safePostJson(url, payload, headers = {}) {
  if (!enabled(url)) return { skipped: true, reason: "not_configured" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AUTOMATION_TIMEOUT_MS || 8000));
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text().catch(() => "");
    return { ok: response.ok, status: response.status, body: text.slice(0, 500) };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

function buildAdminText(title, message, payload = {}) {
  const lines = [
    "♟️ ChessPlay Admin Alert",
    "",
    `Title: ${title}`,
    `Message: ${message}`,
  ];
  if (payload.userEmail) lines.push(`User: ${payload.userEmail}`);
  if (payload.plan) lines.push(`Plan: ${payload.plan}`);
  if (payload.reference) lines.push(`Reference: ${payload.reference}`);
  if (payload.ticketId) lines.push(`Ticket: ${payload.ticketId}`);
  if (payload.amount) lines.push(`Amount: ${payload.amount} ${payload.currency || ""}`.trim());
  return lines.join("\n");
}

async function sendTelegramAlert({ title, message, payload = {} }) {
  if (!enabled(process.env.TELEGRAM_BOT_TOKEN) || !enabled(process.env.TELEGRAM_ADMIN_CHAT_ID)) {
    return { skipped: true, reason: "telegram_not_configured" };
  }

  const text = buildAdminText(title, message, payload);
  const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  return safePostJson(telegramUrl, {
    chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID,
    text: escapeHtml(text),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

function createSmtpTransporter() {
  if (!enabled(process.env.SMTP_HOST) || !enabled(process.env.SMTP_USER) || !enabled(process.env.SMTP_PASS)) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmailAlert({ title, message, payload = {} }) {
  const to = process.env.SUPPORT_EMAIL_TO || process.env.ADMIN_EMAILS;
  if (!enabled(to)) return { skipped: true, reason: "support_email_not_configured" };

  const transporter = createSmtpTransporter();
  if (!transporter) return { skipped: true, reason: "smtp_not_configured" };

  const text = `${buildAdminText(title, message, payload)}\n\nRaw payload:\n${JSON.stringify(payload, null, 2)}`;
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `[ChessPlay] ${title}`,
      text,
    });
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function sendWhatsappPlaceholder() {
  // WhatsApp will be added later. Keep the API stable without failing production.
  return { skipped: true, reason: "whatsapp_later" };
}

async function sendAutomationNotification({ type, user = null, title, message, payload = {}, channels = ["telegram", "email"] }) {
  const sanitizedChannels = channels.filter((channel) => ["telegram", "email", "whatsapp"].includes(channel));
  const event = await AutomationEvent.create({
    type,
    user,
    title,
    message,
    payload,
    channels: sanitizedChannels.length ? sanitizedChannels : ["telegram", "email"],
    status: "queued",
  });

  const responses = {};
  const channelSet = new Set(event.channels);

  if (channelSet.has("telegram")) {
    responses.telegram = await sendTelegramAlert({ title, message, payload: { ...payload, eventId: String(event._id), type } });
  }

  if (channelSet.has("email")) {
    responses.email = await sendEmailAlert({ title, message, payload: { ...payload, eventId: String(event._id), type } });
  }

  if (channelSet.has("whatsapp")) {
    responses.whatsapp = await sendWhatsappPlaceholder();
  }

  const attempted = Object.values(responses).filter((response) => !response?.skipped);
  const sent = attempted.filter((response) => response?.ok || response?.status === 200).length;
  event.responses = responses;
  event.status = attempted.length === 0 ? "queued" : sent === attempted.length ? "sent" : sent > 0 ? "partial" : "failed";
  event.error = event.status === "failed" ? "All configured direct alert channels failed." : "";
  await event.save();
  return event;
}

export { getAutomationStatus,
  redactSecrets,
  sendAutomationNotification,
  sendTelegramAlert,
  sendEmailAlert, };
