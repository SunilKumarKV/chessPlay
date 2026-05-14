const crypto = require("crypto");

const MAX_DATA_URL_BYTES = 900 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function parseDataUrl(dataUrl = "") {
  const match = String(dataUrl).match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  if (!ALLOWED_MIME_TYPES.has(mimeType) || buffer.length > MAX_DATA_URL_BYTES) {
    return null;
  }
  return { mimeType, base64, buffer };
}

function safeExternalImageUrl(url = "") {
  try {
    const parsed = new URL(String(url));
    if (!['https:'].includes(parsed.protocol)) return "";
    if (!/\.(png|jpe?g|webp)(\?.*)?$/i.test(parsed.pathname + parsed.search)) return "";
    return parsed.toString().slice(0, 500);
  } catch {
    return "";
  }
}

async function uploadToCloudinary({ dataUrl, folder = "chessplay/avatars" }) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `avatar_${crypto.randomBytes(8).toString("hex")}`;
  const signatureBase = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(signatureBase).digest("hex");
  const form = new FormData();
  form.append("file", dataUrl);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);
  form.append("public_id", publicId);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.secure_url) {
    throw new Error(json.error?.message || "Cloudinary upload failed");
  }
  return { url: json.secure_url, storage: "cloudinary", publicId: json.public_id };
}

async function storeAvatar({ imageDataUrl, imageUrl }) {
  const external = safeExternalImageUrl(imageUrl);
  if (external) return { url: external, storage: "external-url" };

  const parsed = parseDataUrl(imageDataUrl);
  if (!parsed) {
    throw new Error("Avatar must be a cropped PNG, JPG, or WebP image under 900KB.");
  }

  const cloudinary = await uploadToCloudinary({ dataUrl: imageDataUrl });
  if (cloudinary) return cloudinary;

  // Development-safe fallback. Production should set Cloudinary or S3 env vars.
  return { url: imageDataUrl, storage: "local-data-url" };
}

module.exports = { storeAvatar, safeExternalImageUrl };
