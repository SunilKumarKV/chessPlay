import { useState, useEffect, useCallback } from "react";
import { store } from "../store";
import { loadSettings as loadChessSettings } from "../store/slices/chessSettingsSlice";
import { setAiDifficulty } from "../store/slices/chessGameSlice";

const API_BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"}/api`;

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
    boardOrientation: "white",
  },
  notifications: {
    gameInvites: true,
    moveNotifications: true,
    gameResults: true,
    friendRequests: true,
    tournamentUpdates: true,
    achievementAlerts: true,
  },
  privacy: {
    profileVisibility: true,
    gameHistory: true,
    onlineStatus: true,
    friendRequests: true,
    spectatorMode: false,
  },
};

function mergeSettings(storedSettings = {}) {
  return Object.keys(DEFAULT_SETTINGS).reduce((merged, section) => {
    merged[section] = {
      ...DEFAULT_SETTINGS[section],
      ...(storedSettings[section] || {}),
    };
    return merged;
  }, {});
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
    boardTheme: settings.appearance.boardTheme,
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

      // Try to load from API (user profile data)
      {
        const response = await fetch(`${API_BASE}/auth/profile`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          const userData = data.user;

          // Merge user data with settings
          const updatedSettings = {
            ...localSettings,
            account: {
              ...localSettings.account,
              username: userData.username || "",
              email: userData.email || "",
              bio: userData.bio || "",
              avatar: userData.avatar || null,
              country: userData.country || "US",
            },
            privacy: {
              ...localSettings.privacy,
              ...(userData.privacy || {}),
            },
          };

          setSettings(updatedSettings);
          setOriginalSettings(updatedSettings);
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
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

    if (["theme", "fontFamily", "fontSize", "language"].includes(key)) {
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
    try {
      // Save to API for account data and server-enforced privacy.
      if (
        (Object.keys(changes).includes("account") ||
          Object.keys(changes).includes("privacy"))
      ) {
        const accountData = {
          username: settings.account.username,
          email: settings.account.email,
          bio: settings.account.bio,
          avatar: settings.account.avatar,
          country: settings.account.country,
          privacy: settings.privacy,
        };

        const response = await fetch(`${API_BASE}/auth/profile`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(accountData),
        });

        if (!response.ok) {
          throw new Error("Failed to save account settings");
        }

        // Update stored user data
        const userResponse = await response.json();
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...storedUser,
            id: userResponse.user._id || storedUser.id,
            username: userResponse.user.username,
            email: userResponse.user.email,
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
    } catch (error) {
      console.error("Failed to save settings:", error);
      throw error;
    }
  }, [settings, changes]);

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
        } catch (error) {
          console.error("Failed to auto-save theme setting:", error);
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
