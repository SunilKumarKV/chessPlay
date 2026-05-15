import { useCallback, useEffect, useMemo, useState } from "react";
import { store } from "../store";
import { loadSettings as loadChessSettings } from "../store/slices/chessSettingsSlice";
import { setAiDifficulty } from "../store/slices/chessGameSlice";
import { BOARD_THEME_STORAGE_KEY, normalizeBoardThemeId } from "../features/chess/constants/boardThemes";
import { apiClient } from "../services/apiClient";

const DEFAULT_SETTINGS = {
  profile: {
    username: "",
    email: "",
    bio: "",
    country: "US",
    avatar: null,
  },
  privacy: {
    profileVisibility: "public",
    gameHistoryVisibility: "public",
    friendRequests: "everyone",
  },
  notifications: {
    gameInvites: true,
    friendRequests: true,
    messages: true,
    tournaments: true,
    community: true,
    supporter: true,
  },
  appearance: {
    theme: "system",
    boardTheme: "classic",
  },
  gameplay: {
    defaultMode: "ai",
    boardOrientation: "white",
    moveConfirmation: false,
    soundEffects: true,
    animation: "normal",
  },
  premium: {
    supporterStatus: "free",
    isSupporter: false,
    adsDisabled: false,
    plan: "free",
  },
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeSettings(base = {}) {
  const next = deepClone(DEFAULT_SETTINGS);
  Object.keys(next).forEach((section) => {
    next[section] = { ...next[section], ...(base[section] || {}) };
  });
  next.appearance.boardTheme = normalizeBoardThemeId(
    next.appearance.boardTheme || localStorage.getItem(BOARD_THEME_STORAGE_KEY) || "classic",
  );
  return next;
}

function mapApiResponse(data, localSettings) {
  const user = data?.user || {};
  const serverSettings = data?.settings || {};
  return mergeSettings({
    ...localSettings,
    ...serverSettings,
    profile: {
      ...localSettings.profile,
      username: user.username || localSettings.profile.username || "",
      email: user.email || localSettings.profile.email || "",
      bio: user.bio || "",
      avatar: user.avatar || null,
      country: user.country || "US",
    },
    premium: {
      supporterStatus: user.supporterStatus || (user.isSupporter ? "supporter" : "free"),
      isSupporter: Boolean(user.isSupporter),
      adsDisabled: Boolean(user.adsDisabled),
      plan: user.plan || "free",
    },
  });
}

function syncLocalGamePreferences(settings) {
  const boardTheme = normalizeBoardThemeId(settings.appearance.boardTheme);
  const chessSettings = {
    boardTheme,
    whiteAlwaysOnBottom: settings.gameplay.boardOrientation !== "black",
    confirmMove: Boolean(settings.gameplay.moveConfirmation),
    playSounds: Boolean(settings.gameplay.soundEffects),
    pieceAnimations: settings.gameplay.animation === "reduced" ? "fast" : "medium",
  };
  const existing = JSON.parse(localStorage.getItem("chessplay-settings") || "{}");
  localStorage.setItem("chessplay-settings", JSON.stringify({ ...existing, ...chessSettings }));
  localStorage.setItem(BOARD_THEME_STORAGE_KEY, boardTheme);
  store.dispatch(loadChessSettings(chessSettings));
  store.dispatch(setAiDifficulty(settings.gameplay.defaultMode === "ai" ? 12 : 9));
}

export function useSettings(currentUser) {
  const [settings, setSettings] = useState(() => mergeSettings());
  const [originalSettings, setOriginalSettings] = useState(() => mergeSettings());
  const [loading, setLoading] = useState(Boolean(currentUser && !currentUser.isGuest));
  const [error, setError] = useState("");

  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(originalSettings),
    [settings, originalSettings],
  );

  const loadSettings = useCallback(async () => {
    const stored = localStorage.getItem("userSettings");
    const localSettings = stored ? mergeSettings(JSON.parse(stored)) : mergeSettings();
    const userSettings = mergeSettings({
      ...localSettings,
      profile: {
        ...localSettings.profile,
        username: currentUser?.username || localSettings.profile.username || "",
        email: currentUser?.email || localSettings.profile.email || "",
        avatar: currentUser?.avatar || localSettings.profile.avatar || null,
      },
      premium: {
        ...localSettings.premium,
        isSupporter: Boolean(currentUser?.isSupporter),
        adsDisabled: Boolean(currentUser?.adsDisabled),
        supporterStatus: currentUser?.isSupporter ? "supporter" : localSettings.premium.supporterStatus,
      },
    });

    setSettings(userSettings);
    setOriginalSettings(userSettings);
    setError("");

    if (!currentUser || currentUser.isGuest) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient("/api/settings/me", { skipAuthRefresh: true });
      const merged = mapApiResponse(data, userSettings);
      setSettings(merged);
      setOriginalSettings(merged);
      localStorage.setItem("userSettings", JSON.stringify(merged));
    } catch (apiError) {
      if (apiError.status === 401) {
        setError("Session expired. Please sign in again.");
      } else if (apiError.status === 403) {
        setError("You do not have permission to update these settings.");
      } else {
        setError("Unable to reach server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSection = useCallback((section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }, []);

  const saveSettings = useCallback(async () => {
    const nextSettings = mergeSettings(settings);
    localStorage.setItem("userSettings", JSON.stringify(nextSettings));
    syncLocalGamePreferences(nextSettings);
    window.dispatchEvent(new CustomEvent("appearanceSettingsChanged", { detail: nextSettings.appearance }));

    if (currentUser && !currentUser.isGuest) {
      const data = await apiClient("/api/settings/me", {
        method: "PATCH",
        body: JSON.stringify({
          profile: nextSettings.profile,
          settings: {
            privacy: settings.privacy,
            // nextSettings keeps local normalization before the request is sent.
            normalizedPrivacy: nextSettings.privacy,
            notifications: nextSettings.notifications,
            appearance: nextSettings.appearance,
            gameplay: nextSettings.gameplay,
          },
        }),
      });
      const merged = mapApiResponse(data, nextSettings);
      setSettings(merged);
      setOriginalSettings(merged);
      localStorage.setItem("userSettings", JSON.stringify(merged));
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({
        ...storedUser,
        username: merged.profile.username,
        email: merged.profile.email,
        avatar: merged.profile.avatar,
        isSupporter: merged.premium.isSupporter,
        adsDisabled: merged.premium.adsDisabled,
      }));
      return merged;
    }

    setOriginalSettings(nextSettings);
    return nextSettings;
  }, [currentUser, settings]);

  const resetSettings = useCallback(() => {
    setSettings(deepClone(originalSettings));
  }, [originalSettings]);

  return {
    settings,
    loading,
    error,
    hasChanges,
    loadSettings,
    saveSettings,
    resetSettings,
    updateProfile: (key, value) => updateSection("profile", key, value),
    updatePrivacy: (key, value) => updateSection("privacy", key, value),
    updateNotifications: (key, value) => updateSection("notifications", key, value),
    updateAppearance: (key, value) => updateSection("appearance", key, value),
    updateGameplay: (key, value) => updateSection("gameplay", key, value),
  };
}
