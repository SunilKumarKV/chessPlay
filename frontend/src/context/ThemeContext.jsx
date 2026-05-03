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
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";

    // Check system preference
    if (window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    // Default to dark
    return true;
  });

  const theme = isDark ? THEMES.dark : THEMES.light;

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
    // Update document class for global styling if needed
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light",
    );
  }, [isDark]);

  // Listen for system theme changes
  useEffect(() => {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      const stored = localStorage.getItem("theme");
      if (!stored) {
        setIsDark(e.matches);
      }
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const value = {
    isDark,
    theme,
    toggleTheme,
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
