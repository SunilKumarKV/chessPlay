import { useState, useEffect, useRef } from "react";
import { useSettings } from "../hooks/useSettings";
import { TabBar, PrimaryBtn } from "../components/ui";
import { useTheme } from "../hooks/useTheme";

const API_BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"}/api`;

export default function Settings({ user, onBack }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("account");
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const settings = useSettings();

  const tabs = [
    { id: "account", label: "Account", icon: "👤" },
    { id: "appearance", label: "Appearance", icon: "🎨" },
    { id: "game", label: "Game", icon: "♟️" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "privacy", label: "Privacy", icon: "🔒" },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await settings.saveSettings();
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // Check if any settings have changed
    const hasAnyChanges = Object.keys(settings.changes).length > 0;
    setHasChanges(hasAnyChanges);
  }, [settings.changes]);

  if (settings.loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#81b64c] mx-auto mb-4"></div>
          <p style={{ color: theme.text.secondary }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen font-['Inter']"
      style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}
    >
      {/* Header */}
      <header
        className="border-b px-6 py-4"
        style={{
          backgroundColor: theme.bg.secondary,
          borderColor: theme.border.primary,
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="transition-colors text-sm"
              style={{ color: theme.text.secondary }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = theme.text.primary)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = theme.text.secondary)
              }
            >
              ← Back to Dashboard
            </button>
            <h1
              className="text-xl font-semibold"
              style={{ color: theme.text.primary }}
            >
              Settings
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Tab Navigation */}
          <TabBar
            tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label }))}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Content Area */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: theme.bg.secondary,
              borderColor: theme.border.primary,
              border: `1px solid ${theme.border.primary}`,
            }}
          >
            {activeTab === "account" && (
              <AccountTab user={user} settings={settings} theme={theme} />
            )}
            {activeTab === "appearance" && (
              <AppearanceTab settings={settings} />
            )}
            {activeTab === "game" && <GameTab settings={settings} />}
            {activeTab === "notifications" && (
              <NotificationsTab settings={settings} />
            )}
            {activeTab === "privacy" && <PrivacyTab settings={settings} />}
          </div>
        </div>
      </main>

      {/* Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6">
          <PrimaryBtn
            onClick={handleSave}
            disabled={saving}
            className={saving ? "opacity-50 cursor-not-allowed" : ""}
          >
            {saving ? "Saving..." : "Save Changes"}
          </PrimaryBtn>
        </div>
      )}
    </div>
  );
}

// Account Tab Component
function AccountTab({ user, settings, theme }) {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#81b64c] mx-auto mb-4"></div>
          <p style={{ color: theme.text.secondary }}>Loading user data...</p>
        </div>
      </div>
    );
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: theme.bg.tertiary,
          borderColor: theme.border.primary,
          border: `1px solid ${theme.border.primary}`,
        }}
      >
        <h2
          className="text-xl font-semibold mb-6"
          style={{ color: theme.text.primary }}
        >
          Profile Information
        </h2>

        <div className="flex items-start space-x-6">
          {/* Avatar Upload */}
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full overflow-hidden"
              style={{ backgroundColor: theme.bg.secondary }}
            >
              {avatarPreview || user?.avatar ? (
                <img
                  src={avatarPreview || user.avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
                  👤
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              📷
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Profile Fields */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={settings?.account?.username || user?.username || ""}
                onChange={(e) =>
                  settings?.updateAccount?.("username", e.target.value)
                }
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#81b64c] transition-colors"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={settings?.account?.email || user?.email || ""}
                onChange={(e) =>
                  settings?.updateAccount?.("email", e.target.value)
                }
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#81b64c] transition-colors"
                placeholder="Enter email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                value={settings?.account?.bio || ""}
                onChange={(e) =>
                  settings?.updateAccount?.("bio", e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#81b64c] transition-colors resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-6">
        <button
          onClick={() => setShowPasswordChange(!showPasswordChange)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-xl font-semibold text-white">Change Password</h2>
          <span className="text-gray-400">
            {showPasswordChange ? "−" : "+"}
          </span>
        </button>

        {showPasswordChange && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#81b64c] transition-colors"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#81b64c] transition-colors"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#81b64c] transition-colors"
                placeholder="Confirm new password"
              />
            </div>

            <button className="px-4 py-2 bg-[#81b64c] hover:bg-[#6ba43d] text-white font-medium rounded-lg transition-colors">
              Update Password
            </button>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-red-400">Danger Zone</h2>
        <p className="text-gray-300 mb-4">
          Once you delete your account, there is no going back. Please be
          certain.
        </p>
        <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}

// Appearance Tab Component
function AppearanceTab({ settings }) {
  if (!settings?.appearance) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#81b64c] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading appearance settings...</p>
        </div>
      </div>
    );
  }
  const boardThemes = [
    { id: "classic", name: "Classic", colors: ["#f0d9b5", "#b58863"] },
    { id: "green", name: "Green", colors: ["#81b64c", "#59923b"] },
    { id: "blue", name: "Blue", colors: ["#8b9dc3", "#5d6b7c"] },
    { id: "purple", name: "Purple", colors: ["#9c88ff", "#6c5ce7"] },
    { id: "grey", name: "Grey", colors: ["#a4b0be", "#57606f"] },
    { id: "dark", name: "Dark", colors: ["#2d3436", "#636e72"] },
  ];

  const pieceSets = [
    { id: "classic", name: "Classic", preview: "♔♕♖♗♘♙" },
    { id: "modern", name: "Modern", preview: "♚♛♜♝♞♟" },
    { id: "neo", name: "Neo", preview: "👑♕♖♗♘♙" },
    { id: "minimal", name: "Minimal", preview: "KQRBNP" },
  ];

  return (
    <div className="space-y-6">
      {/* Board Theme */}
      <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-6">
        <h2 className="text-xl font-semibold mb-6 text-white">Board Theme</h2>
        <div className="grid grid-cols-3 gap-4">
          {boardThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => settings.updateAppearance("boardTheme", theme.id)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                settings.appearance.boardTheme === theme.id
                  ? "border-[#81b64c] bg-[#81b64c]/10"
                  : "border-[#2a2a2a] hover:border-[#333]"
              }`}
            >
              <div className="flex space-x-1 mb-2">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.colors[0] }}
                ></div>
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.colors[1] }}
                ></div>
              </div>
              <div className="text-sm font-medium text-white">{theme.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Piece Set */}
      <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-6">
        <h2 className="text-xl font-semibold mb-6 text-white">Piece Set</h2>
        <div className="grid grid-cols-2 gap-4">
          {pieceSets.map((set) => (
            <button
              key={set.id}
              onClick={() => settings.updateAppearance("pieceSet", set.id)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                settings.appearance.pieceSet === set.id
                  ? "border-[#81b64c] bg-[#81b64c]/10"
                  : "border-[#2a2a2a] hover:border-[#333]"
              }`}
            >
              <div className="text-2xl mb-2 text-white">{set.preview}</div>
              <div className="text-sm font-medium text-white">{set.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-6">
        <h2 className="text-xl font-semibold mb-6 text-white">Theme</h2>
        <div className="flex space-x-2">
          {[
            { id: "light", label: "Light", icon: "☀️" },
            { id: "dark", label: "Dark", icon: "🌙" },
            { id: "system", label: "System", icon: "💻" },
          ].map((theme) => (
            <button
              key={theme.id}
              onClick={() => settings.updateAppearance("theme", theme.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                settings.appearance.theme === theme.id
                  ? "border-[#81b64c] bg-[#81b64c]/10 text-[#81b64c]"
                  : "border-[#2a2a2a] hover:border-[#333] text-gray-300"
              }`}
            >
              <span>{theme.icon}</span>
              <span className="font-medium">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-6">
        <h2 className="text-xl font-semibold mb-6 text-white">Font Size</h2>
        <div className="space-y-4">
          <input
            type="range"
            min="12"
            max="20"
            value={settings.appearance.fontSize}
            onChange={(e) =>
              settings.updateAppearance("fontSize", parseInt(e.target.value))
            }
            className="w-full h-2 bg-[#2a2a2a] rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-sm text-gray-400">
            <span>Small (12px)</span>
            <span className="font-medium text-white">
              {settings.appearance.fontSize}px
            </span>
            <span>Large (20px)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Game Tab Component
function GameTab({ settings }) {
  if (!settings?.game) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#81b64c] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading game settings...</p>
        </div>
      </div>
    );
  }
  const timeControls = [
    { id: 0, label: "1+0 Bullet", icon: "⚡" },
    { id: 1, label: "2+1 Bullet", icon: "⚡" },
    { id: 2, label: "3+0 Blitz", icon: "🚀" },
    { id: 3, label: "5+3 Blitz", icon: "🏃" },
    { id: 4, label: "10+0 Rapid", icon: "⏱️" },
    { id: 5, label: "10+5 Rapid", icon: "⏱️" },
    { id: 6, label: "30+0 Classical", icon: "👑" },
  ];

  const difficultyLabels = [
    "Beginner",
    "Easy",
    "Medium",
    "Hard",
    "Expert",
    "Master",
    "Grandmaster",
  ];

  return (
    <div className="space-y-6">
      {/* Game Preferences */}
      <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-6">
        <h2 className="text-xl font-semibold mb-6 text-white">
          Game Preferences
        </h2>
        <div className="space-y-4">
          {[
            { key: "showLegalMoves", label: "Show legal move hints" },
            { key: "showLastMove", label: "Show last move highlight" },
            { key: "soundEnabled", label: "Enable sound effects" },
            { key: "autoPromote", label: "Auto-promote to queen" },
            { key: "confirmMove", label: "Confirm move before submit" },
          ].map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between"
            >
              <span className="text-gray-300">{setting.label}</span>
              <button
                onClick={() =>
                  settings.updateGame(setting.key, !settings.game[setting.key])
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.game[setting.key] ? "bg-[#81b64c]" : "bg-[#2a2a2a]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.game[setting.key]
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Default Time Control */}
      <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-6">
        <h2 className="text-xl font-semibold mb-6 text-white">
          Default Time Control
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {timeControls.map((control) => (
            <button
              key={control.id}
              onClick={() =>
                settings.updateGame("defaultTimeControl", control.id)
              }
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg border transition-colors ${
                settings.game.defaultTimeControl === control.id
                  ? "border-[#81b64c] bg-[#81b64c]/10 text-[#81b64c]"
                  : "border-[#2a2a2a] hover:border-[#333] text-gray-300"
              }`}
            >
              <span>{control.icon}</span>
              <span className="font-medium">{control.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Difficulty */}
      <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-6">
        <h2 className="text-xl font-semibold mb-6 text-white">AI Difficulty</h2>
        <div className="space-y-4">
          <input
            type="range"
            min="0"
            max="6"
            value={settings.game.aiDifficulty}
            onChange={(e) =>
              settings.updateGame("aiDifficulty", parseInt(e.target.value))
            }
            className="w-full h-2 bg-[#2a2a2a] rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Beginner</span>
            <span className="font-medium text-[#81b64c]">
              {difficultyLabels[settings.game.aiDifficulty]}
            </span>
            <span className="text-gray-400">Grandmaster</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notifications Tab Component
function NotificationsTab({ settings }) {
  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-6">
        <h2 className="text-xl font-semibold mb-6 text-white">Notifications</h2>
        <div className="space-y-4">
          {[
            { key: "gameInvites", label: "Game invites" },
            { key: "moveNotifications", label: "Move notifications" },
            { key: "gameResults", label: "Game results" },
            { key: "friendRequests", label: "Friend requests" },
            { key: "tournamentUpdates", label: "Tournament updates" },
            { key: "achievementAlerts", label: "Achievement alerts" },
          ].map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between"
            >
              <span className="text-gray-300">{setting.label}</span>
              <button
                onClick={() =>
                  settings.updateNotifications(
                    setting.key,
                    !settings.notifications[setting.key],
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications[setting.key]
                    ? "bg-[#81b64c]"
                    : "bg-[#2a2a2a]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications[setting.key]
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Privacy Tab Component
function PrivacyTab({ settings }) {
  if (!settings?.privacy) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-gray-400">Loading privacy settings...</div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-6">
        <h2 className="text-xl font-semibold mb-6 text-white">
          Privacy Settings
        </h2>
        <div className="space-y-4">
          {[
            { key: "profileVisibility", label: "Public profile visibility" },
            { key: "gameHistory", label: "Show game history to others" },
            { key: "onlineStatus", label: "Show online status" },
            { key: "friendRequests", label: "Allow friend requests" },
            { key: "spectatorMode", label: "Allow spectators in games" },
          ].map((setting) => (
            <div
              key={setting.key}
              className="flex items-center justify-between"
            >
              <span className="text-gray-300">{setting.label}</span>
              <button
                onClick={() =>
                  settings.updatePrivacy(
                    setting.key,
                    !settings.privacy[setting.key],
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.privacy[setting.key]
                    ? "bg-[#81b64c]"
                    : "bg-[#2a2a2a]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.privacy[setting.key]
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
