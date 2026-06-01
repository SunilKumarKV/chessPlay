import { useId } from "react";

function BrandIconSvg({ title = "ChessPlay", className = "" }) {
  const uniqueId = useId().replaceAll(":", "");
  const titleId = `${uniqueId}-brand-icon-title`;
  const gradientId = `${uniqueId}-brand-icon-fill`;

  return (
    <svg viewBox="0 0 128 128" role="img" aria-labelledby={titleId} className={className}>
      <title id={titleId}>{title}</title>
      <defs>
        <linearGradient id={gradientId} x1="18" x2="112" y1="110" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#F4B400" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="112" height="112" rx="28" fill="#0B0F19" />
      <path d="M34 35c-12 7-19 18-19 31s7 24 19 31c8 5 18 7 31 5V82c-8 3-15 3-21 0-6-3-9-9-9-16s3-13 9-16c6-3 13-3 21 0V31c-13-2-23 0-31 4Z" fill="#F8FAFC" />
      <path d="M70 29h19c16 0 26 10 26 25s-10 25-26 25h-7v23H70V29Zm12 19v13h7c5 0 9-3 9-7s-4-6-9-6h-7Z" fill="#F8FAFC" />
      <path d="M55 36l21 15-15 5 10 14-23-16 14-6-7-12Z" fill={`url(#${gradientId})`} />
      <circle cx="62" cy="46" r="2.8" fill="#0B0F19" />
    </svg>
  );
}

function FullLogoSvg({ title = "ChessPlay", className = "" }) {
  const uniqueId = useId().replaceAll(":", "");
  const titleId = `${uniqueId}-brand-logo-title`;
  const gradientId = `${uniqueId}-brand-logo-fill`;

  return (
    <svg viewBox="0 0 360 96" role="img" aria-labelledby={titleId} className={className}>
      <title id={titleId}>{title}</title>
      <defs>
        <linearGradient id={gradientId} x1="24" x2="96" y1="86" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#F4B400" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="88" height="88" rx="24" fill="#0B0F19" />
      <path d="M26 71h40c-1-9-8-15-18-19 12-3 19-12 17-25L52 16 33 26l10 9-14 12c-8 6-10 15-3 24Z" fill={`url(#${gradientId})`} />
      <path d="M34 39h13l-6 6c-5 4-7 10-3 16h-7c-6-8-5-16 3-22Z" fill="#F8FAFC" opacity="0.92" />
      <path d="M57 64l18-18v10h8v14H69v-8L59 73Z" fill="#F8FAFC" />
      <circle cx="51" cy="31" r="2.2" fill="#0B0F19" />
      <text x="112" y="58" fill="currentColor" fontFamily="Montserrat, Inter, Arial, sans-serif" fontSize="34" fontWeight="900" letterSpacing="0">ChessPlay</text>
      <path d="M114 71h176" stroke="#F4B400" strokeWidth="5" strokeLinecap="round" opacity="0.95" />
      <path d="M283 61l16 10-16 10" fill="none" stroke="#F4B400" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BrandLogo({ variant = "full", className = "" }) {
  if (variant === "icon") {
    return <BrandIconSvg className={className} />;
  }

  return <FullLogoSvg className={className} />;
}
