import React, { useState, useEffect, useCallback } from "react";
import { ThemeContext } from "./ThemeContextObject";

// Theme color definitions
const THEMES = {
  dark: {
    // Primary colors
    primary: "#81b64c",
    primaryDark: "#6a9a3d",
    primaryLight: "#9ecf5e",

    // Background colors
    bg: {
      primary: "#0e0e0e",
      secondary: "#1a1a1a",
      tertiary: "#262421",
      quaternary: "#312e2b",
      overlay: "#111827",
    },

    // Text colors
    text: {
      primary: "#e0e0e0",
      secondary: "#a0a0a0",
      tertiary: "#7a7a7a",
      muted: "#505050",
    },

    // Border colors
    border: {
      primary: "#2a2a2a",
      secondary: "#3a3a3a",
      light: "#404040",
    },

    // Semantic colors
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",

    // UI element colors
    hover: "rgba(129, 182, 76, 0.1)",
    active: "rgba(129, 182, 76, 0.2)",
    disabled: "#4a4a4a",
  },
  light: {
    // Primary colors
    primary: "#81b64c",
    primaryDark: "#6a9a3d",
    primaryLight: "#9ecf5e",

    // Background colors
    bg: {
      primary: "#ffffff",
      secondary: "#f5f5f5",
      tertiary: "#eeeeee",
      quaternary: "#e8e8e8",
      overlay: "#fafafa",
    },

    // Text colors
    text: {
      primary: "#1a1a1a",
      secondary: "#4a4a4a",
      tertiary: "#7a7a7a",
      muted: "#999999",
    },

    // Border colors
    border: {
      primary: "#e0e0e0",
      secondary: "#d0d0d0",
      light: "#c0c0c0",
    },

    // Semantic colors
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
    info: "#1d4ed8",

    // UI element colors
    hover: "rgba(129, 182, 76, 0.08)",
    active: "rgba(129, 182, 76, 0.15)",
    disabled: "#d0d0d0",
  },
  midnight: {
    primary: "#7dd3fc",
    primaryDark: "#0284c7",
    primaryLight: "#bae6fd",
    bg: {
      primary: "#08111f",
      secondary: "#0f1b2d",
      tertiary: "#17243a",
      quaternary: "#20314f",
      overlay: "#0b1626",
    },
    text: {
      primary: "#e6f1ff",
      secondary: "#a9bdd6",
      tertiary: "#7890aa",
      muted: "#53667f",
    },
    border: {
      primary: "#223149",
      secondary: "#304563",
      light: "#3f5a7c",
    },
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#f87171",
    info: "#38bdf8",
    hover: "rgba(125, 211, 252, 0.1)",
    active: "rgba(125, 211, 252, 0.18)",
    disabled: "#34445c",
  },
  tournament: {
    primary: "#d6a94a",
    primaryDark: "#b88925",
    primaryLight: "#f4cf74",
    bg: {
      primary: "#191715",
      secondary: "#24201c",
      tertiary: "#312b24",
      quaternary: "#3b342c",
      overlay: "#211d19",
    },
    text: {
      primary: "#f4ead7",
      secondary: "#cbbda8",
      tertiary: "#9d8e78",
      muted: "#655b4d",
    },
    border: {
      primary: "#3a3128",
      secondary: "#4b4033",
      light: "#5b4e3f",
    },
    success: "#84cc16",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#60a5fa",
    hover: "rgba(214, 169, 74, 0.1)",
    active: "rgba(214, 169, 74, 0.18)",
    disabled: "#554d43",
  },

  royal: {
    primary: "#a78bfa", primaryDark: "#7c3aed", primaryLight: "#c4b5fd",
    bg: { primary: "#140f24", secondary: "#1f1735", tertiary: "#2b2147", quaternary: "#372a5b", overlay: "#1a1230" },
    text: { primary: "#f4f0ff", secondary: "#c9bff0", tertiary: "#9b8bc8", muted: "#6b5b94" },
    border: { primary: "#30234f", secondary: "#44316f", light: "#594091" },
    success: "#22c55e", warning: "#f59e0b", error: "#fb7185", info: "#60a5fa",
    hover: "rgba(167, 139, 250, 0.1)", active: "rgba(167, 139, 250, 0.18)", disabled: "#493b69",
  },
  forest: {
    primary: "#34d399", primaryDark: "#059669", primaryLight: "#86efac",
    bg: { primary: "#071a13", secondary: "#0d261b", tertiary: "#143524", quaternary: "#1d4630", overlay: "#0a2117" },
    text: { primary: "#ecfdf5", secondary: "#b6d7c6", tertiary: "#7faa97", muted: "#527361" },
    border: { primary: "#1c3e2c", secondary: "#28563d", light: "#34704f" },
    success: "#22c55e", warning: "#f59e0b", error: "#f87171", info: "#38bdf8",
    hover: "rgba(52, 211, 153, 0.1)", active: "rgba(52, 211, 153, 0.18)", disabled: "#375340",
  },
  neon: {
    primary: "#22d3ee", primaryDark: "#0891b2", primaryLight: "#f0abfc",
    bg: { primary: "#080817", secondary: "#11102a", tertiary: "#1a1840", quaternary: "#24205a", overlay: "#0b0b20" },
    text: { primary: "#f8fafc", secondary: "#bde7f0", tertiary: "#8cc8d8", muted: "#5b7c8a" },
    border: { primary: "#27326b", secondary: "#37418a", light: "#4f46e5" },
    success: "#22c55e", warning: "#f59e0b", error: "#fb7185", info: "#22d3ee",
    hover: "rgba(34, 211, 238, 0.1)", active: "rgba(217, 70, 239, 0.16)", disabled: "#30345f",
  },
  newspaper: {
    primary: "#3f6f45",
    primaryDark: "#2f5634",
    primaryLight: "#67976c",
    bg: {
      primary: "#f7f3ea",
      secondary: "#eee7da",
      tertiary: "#e4dac8",
      quaternary: "#d9ccb7",
      overlay: "#fbf8f1",
    },
    text: {
      primary: "#231f1a",
      secondary: "#544c42",
      tertiary: "#7d7164",
      muted: "#a19688",
    },
    border: {
      primary: "#d6cbb9",
      secondary: "#c6b9a4",
      light: "#b6a893",
    },
    success: "#15803d",
    warning: "#b45309",
    error: "#b91c1c",
    info: "#1d4ed8",
    hover: "rgba(63, 111, 69, 0.08)",
    active: "rgba(63, 111, 69, 0.14)",
    disabled: "#cfc5b4",
  },
};

const DARK_MODES = new Set(["dark", "midnight", "tournament", "royal", "forest", "neon"]);
const FONT_STACKS = {
  inter: "'Inter', system-ui, sans-serif",
  montserrat: "'Montserrat', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

const ACCENT_COLOR_VALUES = {
  default: "",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  cyan: "#06b6d4",
};

const TEXT_COLOR_VALUES = {
  default: "",
  softWhite: "#f8fafc",
  warm: "#fff7ed",
  cool: "#e0f2fe",
  highContrast: "#ffffff",
};

function getStoredAppearance() {
  try {
    const userSettings = JSON.parse(localStorage.getItem("userSettings") || "{}");
    return userSettings.appearance || {};
  } catch {
    return {};
  }
}

function getInitialThemeMode() {
  const appearance = getStoredAppearance();
  const storedTheme = appearance.theme || localStorage.getItem("theme");
  if (storedTheme === "system") {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return THEMES[storedTheme] ? storedTheme : "dark";
}

function getInitialFont() {
  return getStoredAppearance().fontFamily || "inter";
}

function getInitialFontSize() {
  return Number(getStoredAppearance().fontSize || 16);
}

function getInitialLanguage() {
  return getStoredAppearance().language || "en";
}

function getInitialAccentColor() {
  return getStoredAppearance().accentColor || "";
}

function getInitialTextColor() {
  return getStoredAppearance().textColor || "";
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const [appFont, setAppFont] = useState(getInitialFont);
  const [fontSize, setFontSize] = useState(getInitialFontSize);
  const [language, setLanguage] = useState(getInitialLanguage);
  const [accentColor, setAccentColor] = useState(getInitialAccentColor);
  const [textColor, setTextColor] = useState(getInitialTextColor);

  const baseTheme = THEMES[themeMode] || THEMES.dark;
  const resolvedAccentColor = ACCENT_COLOR_VALUES[accentColor] ?? accentColor;
  const resolvedTextColor = TEXT_COLOR_VALUES[textColor] ?? textColor;
  const theme = {
    ...baseTheme,
    primary: resolvedAccentColor || baseTheme.primary,
    primaryDark: resolvedAccentColor || baseTheme.primaryDark,
    text: {
      ...baseTheme.text,
      primary: resolvedTextColor || baseTheme.text.primary,
    },
  };
  const isDark = DARK_MODES.has(themeMode);

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem("theme", themeMode);
    // Update document class for global styling if needed
    document.documentElement.setAttribute("data-theme", themeMode);
    document.documentElement.style.setProperty("--color-primary", theme.primary);
    document.documentElement.style.setProperty("--color-bg-primary", theme.bg.primary);
    document.documentElement.style.setProperty("--color-bg-secondary", theme.bg.secondary);
    document.documentElement.style.setProperty("--color-bg-tertiary", theme.bg.tertiary);
    document.documentElement.style.setProperty("--color-text-primary", theme.text.primary);
    document.documentElement.style.setProperty("--color-text-secondary", theme.text.secondary);
    document.documentElement.style.setProperty("--color-border-primary", theme.border.primary);
    document.documentElement.style.setProperty(
      "--app-font-family",
      FONT_STACKS[appFont] || FONT_STACKS.inter,
    );
    document.documentElement.style.setProperty("--app-font-size", `${fontSize}px`);
    document.documentElement.lang = language;
    document.body.style.fontFamily = `var(--app-font-family)`;
    document.body.style.fontSize = `var(--app-font-size)`;
  }, [
    appFont,
    fontSize,
    language,
    accentColor,
    textColor,
    theme.bg.primary,
    theme.bg.secondary,
    theme.bg.tertiary,
    theme.border.primary,
    theme.primary,
    theme.text.primary,
    theme.text.secondary,
    themeMode,
  ]);

  useEffect(() => {
    const handleAppearanceChange = (event) => {
      const next = event.detail || getStoredAppearance();
      if (next.theme) {
        const nextTheme =
          next.theme === "system"
            ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light"
            : next.theme;
        if (THEMES[nextTheme]) setThemeMode(nextTheme);
      }
      if (next.fontFamily) setAppFont(next.fontFamily);
      if (next.fontSize) setFontSize(Number(next.fontSize));
      if (next.language) setLanguage(next.language);
      if (next.accentColor !== undefined) setAccentColor(next.accentColor);
      if (next.textColor !== undefined) setTextColor(next.textColor);
    };

    window.addEventListener("appearanceSettingsChanged", handleAppearanceChange);
    return () =>
      window.removeEventListener("appearanceSettingsChanged", handleAppearanceChange);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      const appearance = getStoredAppearance();
      if (appearance.theme === "system") {
        setThemeMode(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode((current) => (DARK_MODES.has(current) ? "light" : "dark"));
  }, []);

  const value = {
    isDark,
    themeMode,
    appFont,
    fontSize,
    language,
    theme,
    toggleTheme,
    setThemeMode,
    setAppFont,
    setFontSize,
    setLanguage,
    setAccentColor,
    setTextColor,
    accentColor,
    textColor,
    // Helper functions for conditional styling
    bg: theme.bg,
    text: theme.text,
    border: theme.border,
    primary: theme.primary,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
