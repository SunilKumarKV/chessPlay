export const BOARD_THEME_STORAGE_KEY = "chessplay.boardTheme";

export const BOARD_THEME_OPTIONS = [
  {
    id: "classic",
    label: "Classic",
    light: "#f0d9b5",
    dark: "#b58863",
    lightText: "#9d704b",
    darkText: "#f3dfc2",
    selected: "rgba(250, 204, 21, 0.42)",
    lastMove: "rgba(250, 204, 21, 0.3)",
    legal: "rgba(24, 24, 24, 0.2)",
    legalCapture: "rgba(24, 24, 24, 0.26)",
    trail: "rgba(255, 238, 173, 0.22)",
    check: "rgba(239, 68, 68, 0.58)",
    glow: "rgba(240, 217, 181, 0.3)",
    border: "#6b442c",
    shadow: "0 26px 70px rgba(0, 0, 0, 0.42)",
    texture:
      "linear-gradient(135deg, rgba(255,255,255,.12), transparent 38%, rgba(0,0,0,.12))",
  },
  {
    id: "wooden",
    label: "Wooden",
    light: "#d8b47a",
    dark: "#7d4d2d",
    lightText: "#7d4d2d",
    darkText: "#f2d9aa",
    selected: "rgba(255, 220, 120, 0.4)",
    lastMove: "rgba(245, 158, 11, 0.34)",
    legal: "rgba(44, 23, 9, 0.24)",
    legalCapture: "rgba(44, 23, 9, 0.32)",
    trail: "rgba(255, 220, 160, 0.22)",
    check: "rgba(220, 38, 38, 0.58)",
    glow: "rgba(216, 180, 122, 0.36)",
    border: "#4a2614",
    shadow: "0 30px 80px rgba(32, 16, 7, 0.6)",
    texture:
      "linear-gradient(90deg, rgba(255,255,255,.1), transparent 18%, rgba(0,0,0,.1) 36%, transparent 58%), repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 2px, transparent 2px 12px)",
  },
  {
    id: "neonDark",
    label: "Neon Dark",
    light: "#1d2b36",
    dark: "#0b1118",
    lightText: "#38bdf8",
    darkText: "#67e8f9",
    selected: "rgba(56, 189, 248, 0.34)",
    lastMove: "rgba(14, 165, 233, 0.3)",
    legal: "rgba(103, 232, 249, 0.35)",
    legalCapture: "rgba(103, 232, 249, 0.52)",
    trail: "rgba(56, 189, 248, 0.22)",
    check: "rgba(244, 63, 94, 0.64)",
    glow: "rgba(56, 189, 248, 0.48)",
    border: "#12364a",
    shadow: "0 0 40px rgba(56, 189, 248, 0.18), 0 34px 90px rgba(0,0,0,.7)",
    texture:
      "radial-gradient(circle at 20% 20%, rgba(56,189,248,.18), transparent 32%), linear-gradient(135deg, rgba(255,255,255,.06), transparent)",
  },
  {
    id: "tournamentGreen",
    label: "Tournament Green",
    light: "#eeeed2",
    dark: "#769656",
    lightText: "#6b8f4e",
    darkText: "#eeeed2",
    selected: "rgba(244, 211, 94, 0.42)",
    lastMove: "rgba(246, 211, 101, 0.38)",
    legal: "rgba(38, 80, 41, 0.24)",
    legalCapture: "rgba(38, 80, 41, 0.34)",
    trail: "rgba(236, 252, 203, 0.22)",
    check: "rgba(220, 38, 38, 0.58)",
    glow: "rgba(129, 182, 76, 0.34)",
    border: "#35542f",
    shadow: "0 28px 76px rgba(21, 44, 23, 0.5)",
    texture:
      "linear-gradient(135deg, rgba(255,255,255,.1), transparent 40%, rgba(0,0,0,.08))",
  },
  {
    id: "minimalLight",
    label: "Minimal Light",
    light: "#f6f7f8",
    dark: "#c9d1d9",
    lightText: "#8a949e",
    darkText: "#f6f7f8",
    selected: "rgba(59, 130, 246, 0.24)",
    lastMove: "rgba(59, 130, 246, 0.2)",
    legal: "rgba(15, 23, 42, 0.18)",
    legalCapture: "rgba(15, 23, 42, 0.24)",
    trail: "rgba(59, 130, 246, 0.16)",
    check: "rgba(239, 68, 68, 0.48)",
    glow: "rgba(148, 163, 184, 0.34)",
    border: "#94a3b8",
    shadow: "0 24px 70px rgba(15, 23, 42, 0.22)",
    texture:
      "linear-gradient(135deg, rgba(255,255,255,.45), transparent 46%, rgba(15,23,42,.06))",
  },
  {
    id: "neonCyberpunk",
    label: "Neon Cyberpunk",
    light: "#25214f",
    dark: "#090817",
    lightText: "#f0abfc",
    darkText: "#22d3ee",
    selected: "rgba(217, 70, 239, 0.38)",
    lastMove: "rgba(34, 211, 238, 0.3)",
    legal: "rgba(34, 211, 238, 0.4)",
    legalCapture: "rgba(217, 70, 239, 0.58)",
    trail: "rgba(217, 70, 239, 0.2)",
    check: "rgba(251, 113, 133, 0.66)",
    glow: "rgba(217, 70, 239, 0.55)",
    border: "#3b2fb0",
    shadow:
      "0 0 34px rgba(217, 70, 239, 0.22), 0 0 54px rgba(34, 211, 238, 0.12), 0 34px 90px rgba(0,0,0,.72)",
    texture:
      "linear-gradient(135deg, rgba(217,70,239,.16), transparent 34%, rgba(34,211,238,.14)), repeating-linear-gradient(90deg, rgba(255,255,255,.04) 0 1px, transparent 1px 18px)",
  },
  {
    id: "marble",
    label: "Marble",
    light: "#f2eee7",
    dark: "#8f9a9c",
    lightText: "#8f9a9c",
    darkText: "#f2eee7",
    selected: "rgba(217, 180, 96, 0.35)",
    lastMove: "rgba(217, 180, 96, 0.27)",
    legal: "rgba(31, 41, 55, 0.22)",
    legalCapture: "rgba(31, 41, 55, 0.3)",
    trail: "rgba(255, 255, 255, 0.25)",
    check: "rgba(185, 28, 28, 0.54)",
    glow: "rgba(242, 238, 231, 0.4)",
    border: "#657174",
    shadow: "0 30px 80px rgba(22, 30, 32, 0.42)",
    texture:
      "linear-gradient(120deg, rgba(255,255,255,.36), transparent 26%, rgba(70,80,86,.14) 48%, transparent 70%), repeating-linear-gradient(145deg, rgba(255,255,255,.08) 0 2px, transparent 2px 18px)",
  },
  {
    id: "glassBoard",
    label: "Glass Board",
    light: "rgba(226, 244, 255, 0.72)",
    dark: "rgba(72, 106, 126, 0.62)",
    lightText: "#557184",
    darkText: "#dff6ff",
    selected: "rgba(125, 211, 252, 0.32)",
    lastMove: "rgba(186, 230, 253, 0.28)",
    legal: "rgba(14, 116, 144, 0.32)",
    legalCapture: "rgba(14, 116, 144, 0.42)",
    trail: "rgba(255, 255, 255, 0.3)",
    check: "rgba(244, 63, 94, 0.58)",
    glow: "rgba(186, 230, 253, 0.48)",
    border: "rgba(186, 230, 253, 0.62)",
    shadow: "0 28px 86px rgba(8, 47, 73, 0.42)",
    texture:
      "linear-gradient(135deg, rgba(255,255,255,.34), transparent 38%, rgba(255,255,255,.12)), radial-gradient(circle at 70% 10%, rgba(255,255,255,.26), transparent 26%)",
  },
  {
    id: "darkPro",
    label: "Dark Pro",
    light: "#4b5563",
    dark: "#111827",
    lightText: "#cbd5e1",
    darkText: "#94a3b8",
    selected: "rgba(129, 182, 76, 0.35)",
    lastMove: "rgba(129, 182, 76, 0.24)",
    legal: "rgba(132, 204, 22, 0.3)",
    legalCapture: "rgba(132, 204, 22, 0.44)",
    trail: "rgba(148, 163, 184, 0.16)",
    check: "rgba(239, 68, 68, 0.62)",
    glow: "rgba(129, 182, 76, 0.36)",
    border: "#020617",
    shadow: "0 32px 90px rgba(0, 0, 0, 0.72)",
    texture:
      "linear-gradient(135deg, rgba(255,255,255,.08), transparent 36%, rgba(0,0,0,.18))",
  },
];

export const BOARD_THEME_ALIASES = {
  green: "tournamentGreen",
  blue: "neonDark",
  brown: "wooden",
  grey: "minimalLight",
  dark: "darkPro",
};

export const BOARD_THEMES = BOARD_THEME_OPTIONS.reduce((themes, theme) => {
  themes[theme.id] = theme;
  return themes;
}, {});

export function normalizeBoardThemeId(themeId) {
  return BOARD_THEMES[themeId]
    ? themeId
    : BOARD_THEME_ALIASES[themeId] || "classic";
}

export function getBoardTheme(themeId) {
  return BOARD_THEMES[normalizeBoardThemeId(themeId)];
}
