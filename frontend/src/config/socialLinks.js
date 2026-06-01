const SOCIAL_CONFIG = [
  ["GitHub", "VITE_GITHUB_URL", import.meta.env.VITE_GITHUB_URL],
  ["LinkedIn", "VITE_LINKEDIN_URL", import.meta.env.VITE_LINKEDIN_URL],
  ["X", "VITE_X_URL", import.meta.env.VITE_X_URL],
  ["YouTube", "VITE_YOUTUBE_URL", import.meta.env.VITE_YOUTUBE_URL],
  ["Instagram", "VITE_INSTAGRAM_URL", import.meta.env.VITE_INSTAGRAM_URL],
  ["Discord", "VITE_DISCORD_URL", import.meta.env.VITE_DISCORD_URL],
];

function cleanValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function externalLink(label, _envName, value) {
  const href = cleanValue(value);
  if (!href) return null;
  return {
    href,
    label,
    ariaLabel: `Open ChessPlay on ${label}`,
    external: true,
  };
}

function contactLink() {
  const email = cleanValue(import.meta.env.VITE_CONTACT_EMAIL);
  if (!email) return null;
  const href = email.startsWith("mailto:") ? email : `mailto:${email}`;
  return {
    href,
    label: "Email",
    ariaLabel: "Email ChessPlay",
    external: false,
  };
}

export const SOCIAL_LINKS = [
  ...SOCIAL_CONFIG.map(([label, envName, value]) => externalLink(label, envName, value)),
  contactLink(),
].filter(Boolean);

export const HAS_SOCIAL_LINKS = SOCIAL_LINKS.length > 0;
