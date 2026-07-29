// @ts-nocheck
import crypto from "crypto";

function isConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function publicKey() {
  return process.env.RAZORPAY_KEY_ID || "";
}

function createLocalOrder({ amount, currency = "INR", receipt, notes = {} }) {
  return {
    id: `order_local_${Date.now()}`,
    amount,
    currency,
    receipt,
    notes,
    status: "created",
    provider: "razorpay",
    configured: false,
  };
}

async function createOrder({ amount, currency = "INR", receipt, notes = {} }) {
  const paiseAmount = Math.round(Number(amount) * 100);
  if (!Number.isFinite(paiseAmount) || paiseAmount <= 0) {
    throw new Error("Invalid order amount");
  }

  if (!isConfigured()) {
    return createLocalOrder({ amount: paiseAmount, currency, receipt, notes });
  }

  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: paiseAmount, currency, receipt, notes }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.description || "Unable to create Razorpay order");
  return { ...data, configured: true };
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const actual = String(signature || "");
  return actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const actual = String(signature);
  return actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export { createOrder,
  isConfigured,
  publicKey,
  verifyPaymentSignature,
  verifyWebhookSignature, };
