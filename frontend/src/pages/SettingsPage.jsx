import { useEffect, useState } from "react";
import { useSettings } from "../hooks/useSettings";
import { useTheme } from "../hooks/useTheme";
import { notifyUserChanged } from "../hooks/useCurrentUser";
import { BOARD_THEME_OPTIONS } from "../features/chess/constants/boardThemes";
import { BACKEND_URL } from "../config/runtime";
import AvatarUploader from "../components/profile/AvatarUploader";
import { LANGUAGES } from "../i18n/languages";
import { useI18n } from "../i18n/useI18n";

const API_BASE = `${BACKEND_URL}/api`;

const SECTIONS = [
  { id: "account", label: "Account", hint: "Profile and sign-in" },
  { id: "privacy", label: "Privacy", hint: "Visibility and requests" },
  { id: "notifications", label: "Notifications", hint: "Alerts and updates" },
  { id: "board", label: "Appearance", hint: "Theme, board, pieces" },
  { id: "play", label: "Gameplay", hint: "Moves, timers, AI" },
  { id: "premium", label: "Premium", hint: "Supporter status" },
  { id: "security", label: "Security", hint: "Password and sessions" },
  { id: "danger", label: "Danger Zone", hint: "Account actions" },
];


const APP_THEMES = [
  { id: "light", label: "Light", colors: ["#ffffff", "#f5f5f5", "#81b64c"] },
  { id: "dark", label: "Dark", colors: ["#0e0e0e", "#262421", "#81b64c"] },
  { id: "midnight", label: "Midnight", colors: ["#08111f", "#17243a", "#7dd3fc"] },
  { id: "tournament", label: "Tournament", colors: ["#191715", "#312b24", "#d6a94a"] },
  { id: "newspaper", label: "Newspaper", colors: ["#f7f3ea", "#e4dac8", "#3f6f45"] },
];

const APP_FONTS = [
  { id: "inter", label: "Inter", sample: "Clean dashboard text" },
  { id: "montserrat", label: "Montserrat", sample: "Strong modern headings" },
  { id: "system", label: "System", sample: "Native device font" },
  { id: "mono", label: "JetBrains Mono", sample: "Clock 10:00 + 3" },
  { id: "serif", label: "Serif", sample: "Classic chess notes" },
];


const ACCENT_COLORS = [
  { id: "", label: "Theme default", color: "#81b64c" },
  { id: "#81b64c", label: "Chess green", color: "#81b64c" },
  { id: "#38bdf8", label: "Sky blue", color: "#38bdf8" },
  { id: "#a78bfa", label: "Royal purple", color: "#a78bfa" },
  { id: "#f59e0b", label: "Gold", color: "#f59e0b" },
  { id: "#ef4444", label: "Blitz red", color: "#ef4444" },
];

const TEXT_COLORS = [
  { id: "", label: "Theme default", color: "var(--color-text-primary)" },
  { id: "#111827", label: "Ink black", color: "#111827" },
  { id: "#f8fafc", label: "Snow white", color: "#f8fafc" },
  { id: "#fde68a", label: "Warm gold", color: "#fde68a" },
  { id: "#bfdbfe", label: "Soft blue", color: "#bfdbfe" },
  { id: "#dcfce7", label: "Soft green", color: "#dcfce7" },
];

const PIECE_SETS = [
  { id: "classic", label: "Classic", preview: "K Q R B N P" },
  { id: "modern", label: "Modern", preview: "K Q R B N P" },
  { id: "neo", label: "Neo", preview: "KQ RBN P" },
  { id: "minimal", label: "Minimal", preview: "KQRBNP" },
];

const TIME_CONTROLS = [
  { id: 0, label: "1+0 Bullet" },
  { id: 1, label: "2+1 Bullet" },
  { id: 2, label: "3+0 Blitz" },
  { id: 3, label: "5+3 Blitz" },
  { id: 4, label: "10+0 Rapid" },
  { id: 5, label: "10+5 Rapid" },
  { id: 6, label: "30+0 Classical" },
];

const AI_LEVELS = [
  "Beginner",
  "Easy",
  "Medium",
  "Hard",
  "Expert",
  "Master",
  "Grandmaster",
];

function panelStyle(theme) {
  return {
    backgroundColor: theme.bg.secondary,
    borderColor: theme.border.secondary,
    color: theme.text.primary,
  };
}

function Card({ title, description, children, theme }) {
  return (
    <section className="rounded-xl border p-4 md:p-5 space-y-4" style={panelStyle(theme)}>
      <div>
        <h2 className="text-lg font-black">{title}</h2>
        {description && (
          <p className="text-sm mt-1" style={{ color: theme.text.secondary }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({ label, description, checked, onChange, theme }) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-lg p-3"
      style={{ backgroundColor: theme.bg.tertiary }}
    >
      <div className="min-w-0">
        <div className="font-semibold">{label}</div>
        {description && (
          <div className="text-sm mt-0.5" style={{ color: theme.text.secondary }}>
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative h-7 w-12 rounded-full flex-shrink-0 transition-colors"
        style={{ backgroundColor: checked ? "#81b64c" : theme.border.primary }}
        aria-pressed={checked}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(23px)" : "translateX(4px)" }}
        />
      </button>
    </div>
  );
}

function SelectRow({ label, value, options, onChange, theme }) {
  return (
    <label
      className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg p-3"
      style={{ backgroundColor: theme.bg.tertiary }}
    >
      <span className="font-semibold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg px-3 py-2 outline-none min-w-48"
        style={{
          backgroundColor: theme.bg.secondary,
          border: `1px solid ${theme.border.secondary}`,
          color: theme.text.primary,
        }}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Segmented({ value, options, onChange, theme }) {
  return (
    <div
      className="grid gap-2 rounded-lg p-1 sm:inline-grid"
      style={{
        gridTemplateColumns: `repeat(${Math.min(options.length, 3)}, minmax(0, 1fr))`,
        backgroundColor: theme.bg.tertiary,
      }}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className="rounded-md px-3 py-2 text-sm font-bold transition-colors"
          style={{
            backgroundColor: value === option.id ? theme.primary : "transparent",
            color: value === option.id ? "#111" : theme.text.secondary,
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function Settings({ user, onBack }) {
  const { theme, isDark } = useTheme();
  const { t } = useI18n();
  const settingsApi = useSettings();
  const current = settingsApi.settings;
  const [activeSection, setActiveSection] = useState("account");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const hasChanges = Object.keys(settingsApi.changes).length > 0;

  useEffect(() => {
    if (!status) return undefined;
    const timeout = window.setTimeout(() => setStatus(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const saveAll = async () => {
    setSaving(true);
    setStatus("");
    try {
      await settingsApi.saveSettings();
      notifyUserChanged();
      setStatus("Settings saved.");
    } catch (error) {
      setStatus(error.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (settingsApi.loading) {
    return (
      <div
        className="min-h-[70vh] flex items-center justify-center"
        style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}
      >
        <div className="text-center">
          <div className="h-10 w-10 mx-auto mb-4 rounded-full border-4 border-[#81b64c] border-t-transparent animate-spin" />
          <p style={{ color: theme.text.secondary }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-full w-full p-4 md:p-8"
      style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-semibold mb-3"
              style={{ color: theme.text.secondary }}
            >
              Back to dashboard
            </button>
            <h1 className="text-3xl font-black font-['Montserrat']">Settings</h1>
            <p className="text-sm mt-1" style={{ color: theme.text.secondary }}>
              Manage your account, privacy, notifications, appearance, gameplay preferences, and supporter status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {status && (
              <span className="text-sm rounded-lg px-3 py-2" style={{ backgroundColor: theme.bg.secondary }}>
                {status}
              </span>
            )}
            <button
              type="button"
              onClick={settingsApi.resetSettings}
              disabled={!hasChanges || saving}
              className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-50"
              style={{ borderColor: theme.border.secondary }}
            >
              {t("reset")}
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={!hasChanges || saving}
              className="rounded-lg px-4 py-2 font-bold disabled:opacity-50"
              style={{ backgroundColor: theme.primary, color: isDark ? "#111" : "#fff" }}
            >
              {saving ? "Saving..." : t("save")}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          <aside className="rounded-xl border p-2 h-fit" style={panelStyle(theme)}>
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className="w-full rounded-lg px-4 py-3 text-left transition-colors"
                style={{
                  backgroundColor: activeSection === section.id ? theme.bg.tertiary : "transparent",
                  color: activeSection === section.id ? theme.text.primary : theme.text.secondary,
                }}
              >
                <div className="font-black">{section.label}</div>
                <div className="text-xs mt-0.5" style={{ color: theme.text.tertiary }}>
                  {section.hint}
                </div>
              </button>
            ))}
          </aside>

          <main className="space-y-5">
            {activeSection === "account" && (
              <AccountSection
                user={user}
                settings={current}
                updateAccount={settingsApi.updateAccount}
                updateAppearance={settingsApi.updateAppearance}
                theme={theme}
                setStatus={setStatus}
              />
            )}
            {activeSection === "board" && (
              <BoardSection
                settings={current}
                updateAppearance={settingsApi.updateAppearance}
                theme={theme}
              />
            )}
            {activeSection === "play" && (
              <PlaySection
                settings={current}
                updateGame={settingsApi.updateGame}
                theme={theme}
              />
            )}
            {activeSection === "notifications" && (
              <NotificationsSection
                settings={current}
                updateNotifications={settingsApi.updateNotifications}
                theme={theme}
              />
            )}
            {activeSection === "privacy" && (
              <PrivacySection
                settings={current}
                updatePrivacy={settingsApi.updatePrivacy}
                theme={theme}
              />
            )}
            {activeSection === "premium" && <PremiumSection user={user} theme={theme} />}
            {activeSection === "security" && <SecuritySection theme={theme} />}
            {activeSection === "danger" && <DangerZoneSection theme={theme} />}
          </main>
        </div>
      </div>
    </div>
  );
}

function AccountSection({ user, settings, updateAccount, updateAppearance, theme, setStatus }) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  const updatePassword = async () => {
    setStatus("");
    if (!passwordForm.currentPassword) {
      setStatus("Current password is required.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setStatus("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatus("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch(`${API_BASE}/auth/password`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to update password.");
      }
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setStatus("Password updated.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <>
      <Card title="Profile" description="These details appear on your ChessPlay profile." theme={theme}>
        <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-5">
          <AvatarUploader
            currentAvatar={settings.account.avatar}
            username={settings.account.username || user?.username}
            theme={theme}
            setStatus={setStatus}
            onUploaded={(avatar) => updateAccount("avatar", avatar || "")}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Username"
              value={settings.account.username}
              onChange={(value) => updateAccount("username", value)}
              theme={theme}
            />
            <TextField
              label="Email"
              type="email"
              value={settings.account.email}
              onChange={(value) => updateAccount("email", value)}
              theme={theme}
            />
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: theme.bg.tertiary, color: theme.text.secondary }}>
              Avatar is now uploaded with crop support. Cloudinary/S3 is used when configured; otherwise a safe local fallback keeps development working.
            </div>
            <TextField
              label="Country code"
              value={settings.account.country || "US"}
              maxLength={2}
              onChange={(value) => updateAccount("country", value.toUpperCase())}
              theme={theme}
            />
            <label className="md:col-span-2 space-y-2 text-sm font-semibold">
              <span>Bio</span>
              <textarea
                value={settings.account.bio || ""}
                onChange={(event) => updateAccount("bio", event.target.value)}
                rows={4}
                maxLength={500}
                className="w-full rounded-lg px-3 py-2 outline-none resize-none"
                style={{
                  backgroundColor: theme.bg.tertiary,
                  border: `1px solid ${theme.border.secondary}`,
                  color: theme.text.primary,
                }}
              />
            </label>
          </div>
        </div>
      </Card>

      <Card title="Language" description="Choose the language used for app preferences and future localized screens." theme={theme}>
        <SelectRow
          label="Display language"
          value={settings.appearance.language || "en"}
          options={LANGUAGES.map((language) => ({
            id: language.id,
            label: `${language.label} · ${language.nativeName}`,
          }))}
          onChange={(value) => updateAppearance("language", value)}
          theme={theme}
        />
      </Card>

      <Card title="Password" description="Update your password for email sign-in. You can also manage security from the Security tab." theme={theme}>
        <button
          type="button"
          onClick={() => setPasswordOpen((open) => !open)}
          className="rounded-lg border px-4 py-2 font-bold"
          style={{ borderColor: theme.border.secondary }}
        >
          {passwordOpen ? "Close Password Form" : "Change Password"}
        </button>

        {passwordOpen && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <TextField
              label="Current password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(value) => setPasswordForm((form) => ({ ...form, currentPassword: value }))}
              theme={theme}
            />
            <TextField
              label="New password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(value) => setPasswordForm((form) => ({ ...form, newPassword: value }))}
              theme={theme}
            />
            <TextField
              label="Confirm password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(value) => setPasswordForm((form) => ({ ...form, confirmPassword: value }))}
              theme={theme}
            />
            <div className="md:col-span-3">
              <button
                type="button"
                onClick={updatePassword}
                disabled={passwordSaving}
                className="rounded-lg px-4 py-2 font-bold disabled:opacity-60 bg-[#81b64c] text-black"
              >
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function BoardSection({ settings, updateAppearance, theme }) {
  return (
    <>
      <Card title="Board Theme" description="Pick the board colors used in chess screens." theme={theme}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BOARD_THEME_OPTIONS.map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => updateAppearance("boardTheme", board.id)}
              className="rounded-lg border p-3 text-left transition-colors"
              style={{
                borderColor:
                  settings.appearance.boardTheme === board.id ? theme.primary : theme.border.secondary,
                backgroundColor: theme.bg.tertiary,
              }}
            >
              <div className="grid grid-cols-4 overflow-hidden rounded-md mb-3 h-12">
                {[board.light, board.dark, board.dark, board.light].map((color, index) => (
                  <span key={`${board.id}-${index}`} style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="font-bold">{board.label}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Pieces And Board" description="Tune visual details for playing and reviewing games." theme={theme}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PIECE_SETS.map((pieceSet) => (
              <button
                key={pieceSet.id}
                type="button"
                onClick={() => updateAppearance("pieceSet", pieceSet.id)}
                className="rounded-lg border p-3 text-left"
                style={{
                  borderColor:
                    settings.appearance.pieceSet === pieceSet.id ? theme.primary : theme.border.secondary,
                  backgroundColor: theme.bg.tertiary,
                }}
              >
                <div className="font-mono text-xl font-black tracking-normal">{pieceSet.preview}</div>
                <div className="text-sm mt-2 font-bold">{pieceSet.label}</div>
              </button>
            ))}
          </div>

          <ToggleRow
            label="Board coordinates"
            description="Show rank and file labels around the board."
            checked={Boolean(settings.appearance.boardCoordinates)}
            onChange={(value) => updateAppearance("boardCoordinates", value)}
            theme={theme}
          />
          <SelectRow
            label="Move notation"
            value={settings.appearance.moveNotation || "san"}
            options={[
              { id: "san", label: "Standard notation" },
              { id: "lan", label: "Long algebraic" },
              { id: "uci", label: "Coordinate notation" },
            ]}
            onChange={(value) => updateAppearance("moveNotation", value)}
            theme={theme}
          />
          <SelectRow
            label="Board animation"
            value={settings.appearance.boardAnimation || "normal"}
            options={[
              { id: "none", label: "None" },
              { id: "fast", label: "Fast" },
              { id: "normal", label: "Normal" },
            ]}
            onChange={(value) => updateAppearance("boardAnimation", value)}
            theme={theme}
          />
        </div>
      </Card>

      <Card title="App Theme" description="Choose the app color mode, font, and text scale." theme={theme}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {APP_THEMES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => updateAppearance("theme", mode.id)}
                className="rounded-lg border p-3 text-left"
                style={{
                  borderColor:
                    settings.appearance.theme === mode.id ? theme.primary : theme.border.secondary,
                  backgroundColor: theme.bg.tertiary,
                }}
              >
                <div className="flex h-9 overflow-hidden rounded-md mb-3">
                  {mode.colors.map((color) => (
                    <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="font-bold">{mode.label}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {APP_FONTS.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => updateAppearance("fontFamily", font.id)}
                className="rounded-lg border p-3 text-left"
                style={{
                  borderColor:
                    settings.appearance.fontFamily === font.id ? theme.primary : theme.border.secondary,
                  backgroundColor: theme.bg.tertiary,
                  fontFamily:
                    font.id === "montserrat"
                      ? "'Montserrat', sans-serif"
                      : font.id === "mono"
                        ? "'JetBrains Mono', monospace"
                        : font.id === "serif"
                          ? "Georgia, serif"
                          : font.id === "system"
                            ? "system-ui, sans-serif"
                            : "'Inter', sans-serif",
                }}
              >
                <div className="font-bold">{font.label}</div>
                <div className="text-sm mt-1" style={{ color: theme.text.secondary }}>
                  {font.sample}
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ColorChoice
              label="Accent color"
              value={settings.appearance.accentColor || ""}
              options={ACCENT_COLORS}
              onChange={(value) => updateAppearance("accentColor", value)}
              theme={theme}
            />
            <ColorChoice
              label="Text color"
              value={settings.appearance.textColor || ""}
              options={TEXT_COLORS}
              onChange={(value) => updateAppearance("textColor", value)}
              theme={theme}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold">Font size</span>
              <span style={{ color: theme.text.secondary }}>{settings.appearance.fontSize}px</span>
            </div>
            <input
              type="range"
              min="12"
              max="20"
              value={settings.appearance.fontSize}
              onChange={(event) => updateAppearance("fontSize", Number(event.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </Card>
    </>
  );
}

function PlaySection({ settings, updateGame, theme }) {
  return (
    <>
      <Card title="Move Behavior" description="Controls used during live games and Play vs AI." theme={theme}>
        <div className="space-y-3">
          {[
            ["showLegalMoves", "Show legal moves", "Highlight valid destinations after selecting a piece."],
            ["showLastMove", "Show last move", "Highlight the latest move on the board."],
            ["soundEnabled", "Sound effects", "Play move, capture, check, and game-end sounds."],
            ["confirmMove", "Confirm moves", "Require confirmation before sending a move."],
            ["premove", "Premoves", "Allow selecting your next move before it is your turn."],
            ["autoQueen", "Auto queen", "Use a queen automatically when promotion is obvious."],
          ].map(([key, label, description]) => (
            <ToggleRow
              key={key}
              label={label}
              description={description}
              checked={Boolean(settings.game[key])}
              onChange={(value) => updateGame(key, value)}
              theme={theme}
            />
          ))}
        </div>
      </Card>

      <Card title="Defaults" description="These values are used when starting new games." theme={theme}>
        <div className="space-y-4">
          <SelectRow
            label="Default time control"
            value={settings.game.defaultTimeControl}
            options={TIME_CONTROLS}
            onChange={(value) => updateGame("defaultTimeControl", Number(value))}
            theme={theme}
          />
          <SelectRow
            label="Board orientation"
            value={settings.game.boardOrientation || "white"}
            options={[
              { id: "white", label: "White at bottom" },
              { id: "black", label: "Black at bottom" },
              { id: "auto", label: "Auto by color" },
            ]}
            onChange={(value) => updateGame("boardOrientation", value)}
            theme={theme}
          />
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold">AI difficulty</span>
              <span style={{ color: theme.text.secondary }}>{AI_LEVELS[settings.game.aiDifficulty]}</span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              value={settings.game.aiDifficulty}
              onChange={(event) => updateGame("aiDifficulty", Number(event.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </Card>
    </>
  );
}

function NotificationsSection({ settings, updateNotifications, theme }) {
  const rows = [
    ["gameInvites", "Game invites", "When someone challenges you."],
    ["moveNotifications", "Move reminders", "When it is your turn in a game."],
    ["gameResults", "Game results", "Win, loss, draw, and rating updates."],
    ["friendRequests", "Friend requests", "New requests and accepted requests."],
    ["messages", "Messages", "New messages from ChessPlay friends."],
    ["tournaments", "Tournament updates", "Tournament rounds, starts, and results."],
    ["community", "Community replies", "Replies to feedback, bugs, and feature requests."],
    ["supporter", "Supporter/payment updates", "Manual verification and supporter status changes."],
    ["achievementAlerts", "Achievements", "New badges and milestones."],
  ];

  return (
    <Card title="Notifications" description="Choose what should show in the top-bar notification panel." theme={theme}>
      <div className="space-y-3">
        {rows.map(([key, label, description]) => (
          <ToggleRow
            key={key}
            label={label}
            description={description}
            checked={Boolean(settings.notifications[key])}
            onChange={(value) => updateNotifications(key, value)}
            theme={theme}
          />
        ))}
      </div>
    </Card>
  );
}

function PrivacySection({ settings, updatePrivacy, theme }) {
  const rows = [
    ["profileVisibility", "Public profile", "Allow other players to view your profile."],
    ["onlineStatus", "Online status", "Show when you are active."],
    ["spectatorMode", "Allow spectators", "Let players watch supported live games."],
  ];

  return (
    <Card title="Privacy" description="Control what other players can see and do." theme={theme}>
      <div className="space-y-3">
        <SelectRow
          label="Game history visibility"
          value={settings.privacy.gameHistoryVisibility || (settings.privacy.gameHistory ? "public" : "private")}
          options={[
            { id: "public", label: "Public" },
            { id: "friends", label: "Friends only" },
            { id: "private", label: "Private" },
          ]}
          onChange={(value) => {
            updatePrivacy("gameHistoryVisibility", value);
            updatePrivacy("gameHistory", value !== "private");
          }}
          theme={theme}
        />
        <SelectRow
          label="Friend requests"
          value={settings.privacy.friendRequestPolicy || (settings.privacy.friendRequests ? "everyone" : "none")}
          options={[
            { id: "everyone", label: "Everyone" },
            { id: "friends_of_friends", label: "Friends of friends" },
            { id: "none", label: "No one" },
          ]}
          onChange={(value) => {
            updatePrivacy("friendRequestPolicy", value);
            updatePrivacy("friendRequests", value !== "none");
          }}
          theme={theme}
        />
        {rows.map(([key, label, description]) => (
          <ToggleRow
            key={key}
            label={label}
            description={description}
            checked={Boolean(settings.privacy[key])}
            onChange={(value) => updatePrivacy(key, value)}
            theme={theme}
          />
        ))}
      </div>
    </Card>
  );
}

function PremiumSection({ user, theme }) {
  const isSupporter = Boolean(user?.isSupporter || user?.adsDisabled || user?.entitlements?.noAds);
  const planLabel = isSupporter ? "Supporter" : user?.planStatus === "pending" ? "Pending verification" : "Free";
  return (
    <div className="space-y-4">
      <Card title="Supporter Status" description="Supporter access is manually verified by the admin and never changes gameplay fairness." theme={theme}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg p-4" style={{ backgroundColor: theme.bg.tertiary }}>
            <div className="text-sm" style={{ color: theme.text.secondary }}>Current plan</div>
            <div className="text-xl font-black mt-1">{planLabel}</div>
          </div>
          <div className="rounded-lg p-4" style={{ backgroundColor: theme.bg.tertiary }}>
            <div className="text-sm" style={{ color: theme.text.secondary }}>Ads status</div>
            <div className="text-xl font-black mt-1">{isSupporter ? "Ads disabled" : "Ads enabled"}</div>
          </div>
          <div className="rounded-lg p-4" style={{ backgroundColor: theme.bg.tertiary }}>
            <div className="text-sm" style={{ color: theme.text.secondary }}>Badge</div>
            <div className="text-xl font-black mt-1">{isSupporter ? "Supporter badge active" : "Not active"}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <a href="/premium" className="rounded-lg px-4 py-2 font-bold bg-[#81b64c] text-black">View Premium</a>
          <a href="/billing" className="rounded-lg border px-4 py-2 font-bold" style={{ borderColor: theme.border.secondary }}>Billing history</a>
          <a href="/support" className="rounded-lg border px-4 py-2 font-bold" style={{ borderColor: theme.border.secondary }}>Support ChessPlay</a>
        </div>
      </Card>
      <Card title="Future supporter preferences" description="These are previews only and will be enabled after the feature is fully available." theme={theme}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {["Neon board theme", "Wood board theme", "Tournament board theme", "Early feature preferences"].map((item) => (
            <div key={item} className="rounded-lg p-3 opacity-75" style={{ backgroundColor: theme.bg.tertiary }}>
              <span className="font-bold">{item}</span> · Supporter preview
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SecuritySection({ theme }) {
  return (
    <div className="space-y-4">
      <Card title="Account security" description="Use a strong password and sign out on shared devices." theme={theme}>
        <p className="text-sm" style={{ color: theme.text.secondary }}>
          Password changes are available in the Account tab. Active sessions and logout-all-devices will be added after secure session revocation UI is ready.
        </p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("chessplay:logout"))}
          className="mt-4 rounded-lg border px-4 py-2 font-bold"
          style={{ borderColor: theme.border.secondary }}
        >
          Logout
        </button>
      </Card>
    </div>
  );
}

function DangerZoneSection({ theme }) {
  return (
    <Card title="Danger Zone" description="Destructive account actions require extra confirmation and backend safety checks." theme={theme}>
      <div className="rounded-lg p-4" style={{ backgroundColor: theme.bg.tertiary }}>
        <div className="font-black">Delete account</div>
        <p className="text-sm mt-1" style={{ color: theme.text.secondary }}>
          Account deletion is available from the dedicated privacy/account deletion flow when enabled. This page will not show fake destructive controls.
        </p>
        <a href="/delete-account" className="inline-block mt-3 rounded-lg border px-4 py-2 font-bold" style={{ borderColor: theme.border.secondary }}>
          Open account deletion page
        </a>
      </div>
    </Card>
  );
}

function ColorChoice({ label, value, options, onChange, theme }) {
  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: theme.bg.tertiary }}>
      <div className="mb-3 text-sm font-black">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(option.id)}
            className="flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs font-bold"
            style={{
              borderColor: value === option.id ? theme.primary : theme.border.secondary,
              color: theme.text.primary,
            }}
          >
            <span
              className="h-5 w-5 rounded-full border"
              style={{ backgroundColor: option.color, borderColor: theme.border.secondary }}
            />
            {option.label}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-xs font-semibold">
        Custom hex
        <input
          type="color"
          value={value || "#81b64c"}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 h-10 w-full rounded-lg"
        />
      </label>
    </div>
  );
}

function TextField({ label, value, onChange, theme, type = "text", maxLength }) {
  return (
    <label className="space-y-2 text-sm font-semibold">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg px-3 py-2 outline-none"
        style={{
          backgroundColor: theme.bg.tertiary,
          border: `1px solid ${theme.border.secondary}`,
          color: theme.text.primary,
        }}
      />
    </label>
  );
}
