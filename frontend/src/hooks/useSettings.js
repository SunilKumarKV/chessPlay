import { useState, useEffect, useCallback } from "react";
import { store } from "../store";
import { loadSettings as loadChessSettings } from "../store/slices/chessSettingsSlice";
import { setAiDifficulty } from "../store/slices/chessGameSlice";
import {
  BOARD_THEME_STORAGE_KEY,
  normalizeBoardThemeId,
} from "../features/chess/constants/boardThemes";
import { BACKEND_URL } from "../config/runtime";

const API_BASE = `${BACKEND_URL}/api`;

// Default settings
const DEFAULT_SETTINGS = {
  account: {
    username: "",
    email: "",
    bio: "",
    avatar: null,
    country: "US",
  },
  appearance: {
    boardTheme: "classic",
    pieceSet: "classic",
    theme: "dark",
    fontFamily: "inter",
    fontSize: 16,
    language: "en",
    accentColor: "",
    textColor: "",
    moveNotation: "san",
    boardCoordinates: true,
    boardAnimation: "normal",
  },
  game: {
    showLegalMoves: true,
    showLastMove: true,
    soundEnabled: true,
    autoPromote: true,
    confirmMove: false,
    defaultTimeControl: 2, // 3+0 Blitz
    aiDifficulty: 3, // Hard
    premove: true,
    autoQueen: true,
    alwaysPromoteToQueen: false,
    defaultMode: "ai",
    boardOrientation: "white",
    moveConfirmation: false,
    soundEffects: true,
    animation: "normal",
  },
  notifications: {
    gameInvites: true,
    moveNotifications: true,
    gameResults: true,
    friendRequests: true,
    messages: true,
    tournamentUpdates: true,
    tournaments: true,
    community: true,
    supporter: true,
    achievementAlerts: true,
  },
  privacy: {
    profileVisibility: true,
    gameHistory: true,
    gameHistoryVisibility: "public",
    onlineStatus: true,
    friendRequests: true,
    friendRequestPolicy: "everyone",
    spectatorMode: false,
  },
};

function mergeSettings(storedSettings = {}) {
  const mergedSettings = Object.keys(DEFAULT_SETTINGS).reduce((merged, section) => {
    merged[section] = {
      ...DEFAULT_SETTINGS[section],
      ...(storedSettings[section] || {}),
    };
    return merged;
  }, {});
  mergedSettings.appearance.boardTheme = normalizeBoardThemeId(
    localStorage.getItem(BOARD_THEME_STORAGE_KEY) ||
      mergedSettings.appearance.boardTheme,
  );
  return mergedSettings;
}

function syncChessSettings(settings) {
  const timeControlMap = {
    0: "bullet",
    1: "bullet",
    2: "blitz",
    3: "blitz",
    4: "rapid",
    5: "rapid",
    6: "classical",
  };

  const animationMap = {
    none: "none",
    fast: "fast",
    normal: "medium",
  };

  const chessSettings = {
    boardTheme: normalizeBoardThemeId(settings.appearance.boardTheme),
    pieceSet: settings.appearance.pieceSet,
    showCoordinates: settings.appearance.boardCoordinates,
    pieceNotation:
      settings.appearance.moveNotation === "san" ? "algebraic" : "figurine",
    whiteAlwaysOnBottom: settings.game.boardOrientation !== "black",
    pieceAnimations: animationMap[settings.appearance.boardAnimation] || "medium",
    highlightLegalMoves: settings.game.showLegalMoves,
    showLegalMoves: settings.game.showLegalMoves,
    playSounds: settings.game.soundEnabled,
    showLastMove: settings.game.showLastMove,
    confirmMove: settings.game.confirmMove,
    autoQueen: settings.game.autoQueen,
    timeControlPreset:
      timeControlMap[settings.game.defaultTimeControl] || "blitz",
  };

  const stored = JSON.parse(localStorage.getItem("chessplay-settings") || "{}");
  localStorage.setItem(
    "chessplay-settings",
    JSON.stringify({ ...stored, ...chessSettings }),
  );
  localStorage.setItem(BOARD_THEME_STORAGE_KEY, chessSettings.boardTheme);
  localStorage.setItem(
    "selectedTimeControl",
    timeControlMap[settings.game.defaultTimeControl] || "blitz",
  );
  store.dispatch(loadChessSettings(chessSettings));
  store.dispatch(setAiDifficulty((Number(settings.game.aiDifficulty) + 1) * 3));
}

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_SETTINGS);
  const [changes, setChanges] = useState({});
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      // Load from localStorage first
      const stored = localStorage.getItem("userSettings");
      const localSettings = stored ? mergeSettings(JSON.parse(stored)) : mergeSettings();
      setSettings(localSettings);
      setOriginalSettings(localSettings);

      const response = await fetch(`${API_BASE}/settings/me`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        const updatedSettings = mergeSettings(data.settings || localSettings);
        setSettings(updatedSettings);
        setOriginalSettings(updatedSettings);
      }
    } catch {
      // Keep local settings when the authenticated settings API is unavailable.
    } finally {
      setLoading(false);
    }
  }, []);

  // Load settings from localStorage and API
  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep compare function to detect changes
  const hasChangesInSection = useCallback((section, current, original) => {
    for (const key in current[section]) {
      if (current[section][key] !== original[section][key]) {
        return true;
      }
    }
    return false;
  }, []);

  // Update changes tracker
  useEffect(() => {
    const newChanges = {};
    Object.keys(settings).forEach((section) => {
      if (hasChangesInSection(section, settings, originalSettings)) {
        newChanges[section] = true;
      }
    });
    setChanges(newChanges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, originalSettings]);

  // Update methods for each section
  const updateAccount = useCallback((key, value) => {
    setSettings((prev) => ({
      ...prev,
      account: { ...prev.account, [key]: value },
    }));
  }, []);

  const updateAppearance = useCallback((key, value) => {
    setSettings((prev) => ({
      ...prev,
      appearance: { ...prev.appearance, [key]: value },
    }));

    if (["theme", "fontFamily", "fontSize", "language", "accentColor", "textColor"].includes(key)) {
      window.dispatchEvent(
        new CustomEvent("appearanceSettingsChanged", {
          detail: { [key]: value },
        }),
      );
    }
  }, []);

  const updateGame = useCallback((key, value) => {
    setSettings((prev) => ({
      ...prev,
      game: { ...prev.game, [key]: value },
    }));
  }, []);

  const updateNotifications = useCallback((key, value) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  }, []);

  const updatePrivacy = useCallback((key, value) => {
    setSettings((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value },
    }));
  }, []);

  // Save settings to API and localStorage
  const saveSettings = useCallback(async () => {
      const response = await fetch(`${API_BASE}/settings/me`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
        // production smoke check: privacy: settings.privacy
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to update settings.");
      }

      if (payload.user) {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...storedUser,
            id: payload.user.id || storedUser.id,
            username: payload.user.username,
            email: payload.user.email,
            avatar: payload.user.avatar,
            isSupporter: payload.user.isSupporter,
            adsDisabled: payload.user.adsDisabled,
          }),
        );
      }

      // Save all settings to localStorage
      localStorage.setItem("userSettings", JSON.stringify(settings));
      window.dispatchEvent(
        new CustomEvent("appearanceSettingsChanged", {
          detail: settings.appearance,
        }),
      );
      syncChessSettings(settings);

      // Update original settings to reflect saved state
      setOriginalSettings({ ...settings });

      return true;
  }, [settings]);

  // Reset settings to original
  const resetSettings = useCallback(() => {
    setSettings({ ...originalSettings });
    window.dispatchEvent(
      new CustomEvent("appearanceSettingsChanged", {
        detail: originalSettings.appearance,
      }),
    );
  }, [originalSettings]);

  // Get specific setting value
  const getSetting = useCallback(
    (section, key) => {
      return settings[section]?.[key];
    },
    [settings],
  );

  // Generic update method
  const updateSetting = useCallback(
    async (section, key, value) => {
      setSettings((prev) => ({
        ...prev,
        [section]: { ...prev[section], [key]: value },
      }));

      // Auto-save certain settings immediately
      if (section === "appearance" && key === "theme") {
        try {
          const updatedSettings = {
            ...settings,
            [section]: { ...settings[section], [key]: value },
          };
          localStorage.setItem("userSettings", JSON.stringify(updatedSettings));
        } catch {
          // localStorage can fail in private mode; ignore auto-save failures.
        }
      }
    },
    [settings],
  );

  return {
    settings,
    changes,
    loading,
    updateAccount,
    updateAppearance,
    updateGame,
    updateNotifications,
    updatePrivacy,
    updateSetting,
    saveSettings,
    resetSettings,
    getSetting,
  };
}
