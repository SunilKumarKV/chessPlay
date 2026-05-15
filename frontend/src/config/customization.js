export const FREE_APP_THEMES = [
  { id: "system", label: "System", description: "Follow your device preference.", free: true },
  { id: "light", label: "Light", description: "Clean daytime boardroom style.", free: true },
  { id: "dark", label: "Dark", description: "Focused dark ChessPlay style.", free: true },
  { id: "newspaper", label: "Classic", description: "Warm classic reading theme.", free: true },
];

export const SUPPORTER_APP_THEMES = [
  { id: "midnight", label: "Midnight", description: "Deep blue premium focus theme." },
  { id: "tournament", label: "Tournament", description: "Gold-accent event theme." },
  { id: "royal", label: "Royal", description: "Royal purple supporter preview." },
  { id: "forest", label: "Forest", description: "Emerald calm supporter preview." },
  { id: "neon", label: "Neon", description: "Cyber glow supporter preview." },
];

export const APP_THEME_OPTIONS = [...FREE_APP_THEMES, ...SUPPORTER_APP_THEMES.map((theme) => ({ ...theme, supporter: true }))];

export const ACCENT_COLOR_OPTIONS = [
  { id: "default", label: "Default", value: "" , free: true},
  { id: "blue", label: "Blue", value: "#3b82f6" },
  { id: "purple", label: "Purple", value: "#8b5cf6" },
  { id: "emerald", label: "Emerald", value: "#10b981" },
  { id: "amber", label: "Amber", value: "#f59e0b" },
  { id: "rose", label: "Rose", value: "#f43f5e" },
  { id: "cyan", label: "Cyan", value: "#06b6d4" },
];

export const TEXT_COLOR_OPTIONS = [
  { id: "default", label: "Default", value: "", free: true },
  { id: "softWhite", label: "Soft White", value: "#f8fafc" },
  { id: "warm", label: "Warm", value: "#fff7ed" },
  { id: "cool", label: "Cool", value: "#e0f2fe" },
  { id: "highContrast", label: "High Contrast", value: "#ffffff" },
];

export const FREE_BOARD_THEMES = ["classic", "tournamentGreen", "neonDark"];
export const SUPPORTER_BOARD_THEMES = ["wooden", "marble", "neonCyberpunk", "glassBoard", "darkPro", "minimalLight"];

export const BADGE_OPTIONS = [
  { id: "new-player", label: "New Player", rarity: "Common", description: "Default ChessPlay player badge.", free: true },
  { id: "active-player", label: "Active Player", rarity: "Common", description: "Shown when you start building game history.", free: true },
  { id: "community-member", label: "Community Member", rarity: "Common", description: "For players joining the community experience.", free: true },
  { id: "supporter", label: "Supporter", rarity: "Supporter", description: "For manually verified ChessPlay supporters.", supporter: true },
  { id: "founder-supporter", label: "Founder Supporter", rarity: "Special", description: "Founder-style badge for early supporters.", supporter: true },
  { id: "premium-player", label: "Premium Player", rarity: "Supporter", description: "Premium cosmetic identity badge.", supporter: true },
  { id: "early-access", label: "Early Access", rarity: "Special", description: "For early access supporters and testers.", supporter: true },
  { id: "puzzle-learner", label: "Puzzle Learner", rarity: "Achievement", description: "Preview achievement badge for puzzle practice." },
  { id: "tournament-ready", label: "Tournament Ready", rarity: "Achievement", description: "Preview badge for tournament-ready players." },
  { id: "referral-builder", label: "Referral Builder", rarity: "Achievement", description: "Preview badge for growing ChessPlay." },
  { id: "analysis-explorer", label: "Analysis Explorer", rarity: "Achievement", description: "Preview badge for game review explorers." },
];

export function isSupporterOnlyTheme(themeId) {
  return SUPPORTER_APP_THEMES.some((theme) => theme.id === themeId);
}

export function isSupporterOnlyBoard(boardThemeId) {
  return SUPPORTER_BOARD_THEMES.includes(boardThemeId);
}

export function isSupporterOnlyBadge(badgeId) {
  return BADGE_OPTIONS.some((badge) => badge.id === badgeId && badge.supporter);
}

export function getBadgeLabel(badgeId) {
  return BADGE_OPTIONS.find((badge) => badge.id === badgeId)?.label || "No badge selected";
}
