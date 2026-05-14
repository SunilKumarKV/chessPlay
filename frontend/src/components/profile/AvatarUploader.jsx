import { useMemo, useRef, useState } from "react";
import { apiClient } from "../../services/apiClient";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

async function cropImageDataUrl(src, zoom = 1, offsetX = 0, offsetY = 0) {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  await image.decode();

  const size = 384;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser image crop is unavailable.");

  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  const scale = Math.max(size / image.width, size / image.height) * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (size - drawWidth) / 2 + offsetX;
  const y = (size - drawHeight) / 2 + offsetY;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
  ctx.restore();
  return canvas.toDataURL("image/jpeg", 0.88);
}

export default function AvatarUploader({ currentAvatar, username, onUploaded, theme, setStatus }) {
  const inputRef = useRef(null);
  const [source, setSource] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);

  const initials = useMemo(() => (username || "U").charAt(0).toUpperCase(), [username]);

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus?.("Please select an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setStatus?.("Image must be below 3MB before crop.");
      return;
    }
    try {
      const dataUrl = await readImageFile(file);
      setSource(dataUrl);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setStatus?.("Crop the image and click Save photo.");
    } catch (error) {
      setStatus?.(error.message);
    }
  };

  const saveAvatar = async () => {
    if (!source) return;
    setSaving(true);
    try {
      const croppedDataUrl = await cropImageDataUrl(source, zoom, offsetX, offsetY);
      const data = await apiClient("/api/auth/avatar", {
        method: "POST",
        body: JSON.stringify({ imageDataUrl: croppedDataUrl }),
      });
      onUploaded?.(data.avatar);
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...storedUser, avatar: data.avatar }));
      setSource("");
      setStatus?.(data.storage === "local-data-url" ? "Photo saved. Add Cloudinary/S3 env for production CDN storage." : "Photo uploaded.");
    } catch (error) {
      setStatus?.(error.message || "Photo upload failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className="relative h-32 w-32 rounded-3xl overflow-hidden flex items-center justify-center text-5xl font-black shadow-xl"
        style={{ backgroundColor: theme.bg.tertiary, border: `1px solid ${theme.border.secondary}` }}
      >
        {source || currentAvatar ? (
          <img src={source || currentAvatar} alt="Avatar preview" className="h-full w-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={chooseFile} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-xl px-3 py-2 text-sm font-bold"
          style={{ backgroundColor: theme.primary, color: "#111" }}
        >
          Change photo
        </button>
        {currentAvatar && (
          <button
            type="button"
            onClick={() => onUploaded?.("")}
            className="rounded-xl border px-3 py-2 text-sm font-bold"
            style={{ borderColor: theme.border.secondary }}
          >
            Remove
          </button>
        )}
      </div>

      {source && (
        <div className="rounded-2xl border p-3 space-y-3" style={{ borderColor: theme.border.secondary, backgroundColor: theme.bg.tertiary }}>
          <div className="text-sm font-bold">Crop photo</div>
          <label className="block text-xs font-semibold">
            Zoom
            <input type="range" min="1" max="2.8" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full" />
          </label>
          <label className="block text-xs font-semibold">
            Move X
            <input type="range" min="-120" max="120" value={offsetX} onChange={(event) => setOffsetX(clamp(Number(event.target.value), -120, 120))} className="w-full" />
          </label>
          <label className="block text-xs font-semibold">
            Move Y
            <input type="range" min="-120" max="120" value={offsetY} onChange={(event) => setOffsetY(clamp(Number(event.target.value), -120, 120))} className="w-full" />
          </label>
          <button type="button" onClick={saveAvatar} disabled={saving} className="rounded-xl bg-[#81b64c] px-3 py-2 text-sm font-black text-black disabled:opacity-60">
            {saving ? "Saving..." : "Save photo"}
          </button>
        </div>
      )}
    </div>
  );
}
