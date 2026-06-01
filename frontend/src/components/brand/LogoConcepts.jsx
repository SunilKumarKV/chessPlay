const BRAND_COLORS = {
  gold: "#F4B400",
  indigo: "#4F46E5",
  dark: "#0B0F19",
};

export function KnightGrowthArrowLogo() {
  return (
    <svg viewBox="0 0 128 128" role="img" aria-label="Knight and growth arrow ChessPlay logo concept" className="h-full max-h-48 w-full max-w-48">
      <defs>
        <linearGradient id="knightGrowthGradient" x1="18" x2="110" y1="110" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor={BRAND_COLORS.indigo} />
          <stop offset="1" stopColor={BRAND_COLORS.gold} />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="112" height="112" rx="28" fill={BRAND_COLORS.dark} />
      <path d="M36 94h52c-2-11-10-19-22-24 15-3 24-15 22-31L70 22 44 35l14 12-18 15c-10 8-13 20-4 32Z" fill="url(#knightGrowthGradient)" />
      <path d="M46 51h17l-8 7c-7 6-9 13-4 21h-8c-8-10-6-21 3-28Z" fill="#fff" opacity="0.9" />
      <path d="M74 84l23-23v14h11v18H90v-11L76 96Z" fill="#fff" />
      <circle cx="68" cy="40" r="3" fill={BRAND_COLORS.dark} />
    </svg>
  );
}

export function CpHiddenKnightLogo() {
  return (
    <svg viewBox="0 0 128 128" role="img" aria-label="CP monogram with hidden knight ChessPlay logo concept" className="h-full max-h-48 w-full max-w-48">
      <rect x="8" y="8" width="112" height="112" rx="30" fill="#fff" />
      <path d="M37 35c-12 7-19 18-19 31s7 24 19 31c8 5 18 7 31 5V82c-8 3-16 3-22-1-5-3-8-8-8-15s3-12 8-15c6-4 14-4 22-1V30c-13-2-23 0-31 5Z" fill={BRAND_COLORS.dark} />
      <path d="M70 28h19c15 0 25 10 25 24 0 15-10 25-25 25H82v24H70V28Zm12 19v13h7c5 0 9-3 9-7s-4-6-9-6h-7Z" fill={BRAND_COLORS.indigo} />
      <path d="M56 37l18 14-14 5 9 12-20-15 13-5-6-11Z" fill={BRAND_COLORS.gold} />
    </svg>
  );
}

export function CpGrowthPathLogo() {
  return (
    <svg viewBox="0 0 128 128" role="img" aria-label="CP monogram with growth path ChessPlay logo concept" className="h-full max-h-48 w-full max-w-48">
      <rect x="8" y="8" width="112" height="112" rx="28" fill={BRAND_COLORS.dark} />
      <path d="M30 36c-11 7-17 17-17 30s6 23 17 30c8 5 18 7 31 5V82c-8 3-15 3-21 0-5-3-8-9-8-16s3-13 8-16c6-3 13-3 21 0V31c-13-2-23 0-31 5Z" fill="#fff" />
      <path d="M67 30h22c16 0 26 10 26 25s-10 25-26 25h-8v22H67V30Zm14 20v12h8c5 0 8-2 8-6s-3-6-8-6h-8Z" fill="#fff" />
      <path d="M32 91c20-21 41-32 67-37" fill="none" stroke={BRAND_COLORS.gold} strokeLinecap="round" strokeWidth="8" />
      <path d="M92 43l18 7-14 13" fill="none" stroke={BRAND_COLORS.gold} strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" />
      <circle cx="45" cy="79" r="4" fill={BRAND_COLORS.indigo} />
      <circle cx="64" cy="66" r="4" fill={BRAND_COLORS.indigo} />
    </svg>
  );
}
