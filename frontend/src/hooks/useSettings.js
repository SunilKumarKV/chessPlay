import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:3001/api";

// Default settings
const DEFAULT_SETTINGS = {
  account: {
    username: "",
    email: "",
    bio: "",
    avatar: null,
  },
  appearance: {
    boardTheme: "classic",
    pieceSet: "classic",
    theme: "dark",
    fontSize: 16,
  },
  game: {
    showLegalMoves: true,
    showLastMove: true,
    soundEnabled: true,
    autoPromote: true,
    confirmMove: false,
    defaultTimeControl: 2, // 3+0 Blitz
    aiDifficulty: 3, // Hard
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

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_SETTINGS);
  const [changes, setChanges] = useState({});
  const [loading, setLoading] = useState(true);

  // Load settings from localStorage and API
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load from localStorage first
      const stored = localStorage.getItem("userSettings");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        setOriginalSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }

      // Try to load from API (user profile data)
      const token = localStorage.getItem("token");
      if (token) {
        const response = await fetch(`${API_BASE}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const userData = data.user;

          // Merge user data with settings
          const updatedSettings = {
            ...settings,
            account: {
              ...settings.account,
              username: userData.username || "",
              email: userData.email || "",
              bio: userData.bio || "",
              avatar: userData.avatar || null,
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
  };

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
    Object.keys(settings).forEach(section => {
      if (hasChangesInSection(section, settings, originalSettings)) {
        newChanges[section] = true;
      }
    });
    setChanges(newChanges);
  }, [settings, originalSettings, hasChangesInSection]);

  // Update methods for each section
  const updateAccount = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      account: { ...prev.account, [key]: value }
    }));
  }, []);

  const updateAppearance = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      appearance: { ...prev.appearance, [key]: value }
    }));
  }, []);

  const updateGame = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      game: { ...prev.game, [key]: value }
    }));
  }, []);

  const updateNotifications = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  }, []);

  const updatePrivacy = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value }
    }));
  }, []);

  // Save settings to API and localStorage
  const saveSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      // Save to API (only account data for now)
      if (token && Object.keys(changes).includes("account")) {
        const accountData = {
          username: settings.account.username,
          email: settings.account.email,
          bio: settings.account.bio,
        };

        const response = await fetch(`${API_BASE}/auth/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(accountData),
        });

        if (!response.ok) {
          throw new Error("Failed to save account settings");
        }

        // Update stored user data
        const userResponse = await response.json();
        localStorage.setItem("user", JSON.stringify(userResponse.user));
      }

      // Save all settings to localStorage
      localStorage.setItem("userSettings", JSON.stringify(settings));

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
  }, [originalSettings]);

  // Get specific setting value
  const getSetting = useCallback((section, key) => {
    return settings[section]?.[key];
  }, [settings]);

  // Generic update method
  const updateSetting = useCallback(async (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));

    // Auto-save certain settings immediately
    if (section === "appearance" && key === "theme") {
      try {
        const updatedSettings = {
          ...settings,
          [section]: { ...settings[section], [key]: value }
        };
        localStorage.setItem("userSettings", JSON.stringify(updatedSettings));
      } catch (error) {
        console.error("Failed to auto-save theme setting:", error);
      }
    }
  }, [settings]);

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