import { useEffect, useState } from "react";
import { useSettings } from "../hooks/useSettings";
import { useTheme } from "../hooks/useTheme";
import { notifyUserChanged } from "../hooks/useCurrentUser";

const API_BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"}/api`;

const SECTIONS = [
  { id: "account", label: "Account", hint: "Profile and sign-in" },
  { id: "board", label: "Board", hint: "Pieces, colors, notation" },
  { id: "play", label: "Play", hint: "Moves, timers, AI" },
  { id: "notifications", label: "Notifications", hint: "Alerts and updates" },
  { id: "privacy", label: "Privacy", hint: "Visibility and requests" },
];

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
  { id: "ta", label: "Tamil" },
  { id: "te", label: "Telugu" },
  { id: "kn", label: "Kannada" },
  { id: "ml", label: "Malayalam" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
];

const BOARD_THEMES = [
  { id: "classic", label: "Classic", light: "#f0d9b5", dark: "#b58863" },
  { id: "green", label: "Green", light: "#eeeed2", dark: "#769656" },
  { id: "blue", label: "Blue", light: "#dee3e6", dark: "#8ca2ad" },
  { id: "brown", label: "Walnut", light: "#ead7b8", dark: "#946f51" },
  { id: "grey", label: "Slate", light: "#c8c8c8", dark: "#777777" },
  { id: "dark", label: "Night", light: "#6b7280", dark: "#262626" },
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
              Control your account, board, play preferences, alerts, and privacy.
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
              Reset
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={!hasChanges || saving}
              className="rounded-lg px-4 py-2 font-bold disabled:opacity-50"
              style={{ backgroundColor: theme.primary, color: isDark ? "#111" : "#fff" }}
            >
              {saving ? "Saving..." : "Save"}
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
          <div className="space-y-3">
            <div
              className="h-28 w-28 rounded-xl overflow-hidden flex items-center justify-center text-4xl font-black"
              style={{ backgroundColor: theme.bg.tertiary }}
            >
              {settings.account.avatar ? (
                <img src={settings.account.avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{(settings.account.username || user?.username || "U").charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
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
            <TextField
              label="Avatar URL"
              value={settings.account.avatar || ""}
              onChange={(value) => updateAccount("avatar", value)}
              theme={theme}
            />
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
          options={LANGUAGES}
          onChange={(value) => updateAppearance("language", value)}
          theme={theme}
        />
      </Card>

      <Card title="Security" description="Update your password for email sign-in." theme={theme}>
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
          {BOARD_THEMES.map((board) => (
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
    ["tournamentUpdates", "Tournament updates", "Tournament rounds, starts, and results."],
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
    ["gameHistory", "Public game history", "Show your finished games to other players."],
    ["onlineStatus", "Online status", "Show when you are active."],
    ["friendRequests", "Allow friend requests", "Let players send you connection requests."],
    ["spectatorMode", "Allow spectators", "Let players watch supported live games."],
  ];

  return (
    <Card title="Privacy" description="Control what other players can see and do." theme={theme}>
      <div className="space-y-3">
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
