import { useEffect, useMemo, useState } from "react";
import { useSettings } from "../hooks/useSettings";
import { useTheme } from "../hooks/useTheme";
import { notifyUserChanged } from "../hooks/useCurrentUser";
import { apiClient } from "../services/apiClient";
import { APP_THEME_OPTIONS, ACCENT_COLOR_OPTIONS, TEXT_COLOR_OPTIONS, BADGE_OPTIONS, FREE_BOARD_THEMES, SUPPORTER_BOARD_THEMES, isSupporterOnlyTheme, isSupporterOnlyBoard, isSupporterOnlyBadge } from "../config/customization";
import { BOARD_THEMES } from "../features/chess/constants/boardThemes";

const SECTIONS = [
  { id: "account", label: "Account", helper: "Username and profile basics" },
  { id: "privacy", label: "Privacy", helper: "Profile and history visibility" },
  { id: "notifications", label: "Notifications", helper: "Choose important alerts" },
  { id: "appearance", label: "Appearance", helper: "Theme and board style" },
  { id: "gameplay", label: "Gameplay", helper: "Default play preferences" },
  { id: "premium", label: "Premium", helper: "Supporter status" },
  { id: "security", label: "Security", helper: "Password and sessions" },
  { id: "danger", label: "Danger Zone", helper: "Account safety" },
];

const SELECTS = {
  profileVisibility: [
    { value: "public", label: "Public profile" },
    { value: "private", label: "Private profile" },
  ],
  gameHistoryVisibility: [
    { value: "public", label: "Public" },
    { value: "friends", label: "Friends only" },
    { value: "private", label: "Private" },
  ],
  friendRequests: [
    { value: "everyone", label: "Everyone" },
    { value: "friendsOfFriends", label: "Friends of friends" },
    { value: "none", label: "No one" },
  ],
  theme: APP_THEME_OPTIONS.map((option) => ({ value: option.id, label: option.supporter ? `${option.label} · Supporter` : option.label })),
  accentColor: ACCENT_COLOR_OPTIONS.map((option) => ({ value: option.id, label: option.label })),
  textColor: TEXT_COLOR_OPTIONS.map((option) => ({ value: option.id, label: option.label })),
  boardTheme: [...FREE_BOARD_THEMES, ...SUPPORTER_BOARD_THEMES].map((id) => ({ value: id, label: `${BOARD_THEMES[id]?.label || id}${SUPPORTER_BOARD_THEMES.includes(id) ? " · Supporter" : ""}` })),
  defaultMode: [
    { value: "ai", label: "Play vs AI" },
    { value: "online", label: "Play Online" },
    { value: "player", label: "Play vs Player" },
  ],
  boardOrientation: [
    { value: "white", label: "White" },
    { value: "black", label: "Black" },
    { value: "auto", label: "Auto" },
  ],
  animation: [
    { value: "normal", label: "Normal" },
    { value: "reduced", label: "Reduced" },
  ],
};

function panel(theme) {
  return {
    backgroundColor: theme.bg.secondary,
    borderColor: theme.border.secondary,
    color: theme.text.primary,
  };
}

function Card({ title, description, children, theme }) {
  return (
    <section className="rounded-2xl border p-4 md:p-5 space-y-4" style={panel(theme)}>
      <div>
        <h2 className="text-lg font-black">{title}</h2>
        {description ? <p className="text-sm mt-1" style={{ color: theme.text.secondary }}>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function TextField({ label, value, onChange, theme, type = "text", disabled = false, helper, maxLength }) {
  return (
    <label className="block space-y-2 text-sm font-semibold">
      <span>{label}</span>
      <input
        type={type}
        value={value || ""}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl px-3 py-2.5 outline-none disabled:cursor-not-allowed disabled:opacity-70"
        style={{
          backgroundColor: theme.bg.tertiary,
          border: `1px solid ${theme.border.secondary}`,
          color: theme.text.primary,
        }}
      />
      {helper ? <span className="text-xs font-normal" style={{ color: theme.text.tertiary }}>{helper}</span> : null}
    </label>
  );
}

function SelectField({ label, value, options, onChange, theme, helper }) {
  return (
    <label className="block space-y-2 text-sm font-semibold">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl px-3 py-2.5 outline-none"
        style={{
          backgroundColor: theme.bg.tertiary,
          border: `1px solid ${theme.border.secondary}`,
          color: theme.text.primary,
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {helper ? <span className="text-xs font-normal" style={{ color: theme.text.tertiary }}>{helper}</span> : null}
    </label>
  );
}

function Toggle({ label, description, checked, onChange, theme }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl p-3" style={{ backgroundColor: theme.bg.tertiary }}>
      <div className="min-w-0">
        <p className="font-bold">{label}</p>
        <p className="text-sm mt-0.5" style={{ color: theme.text.secondary }}>{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        aria-label={label}
        className="relative h-7 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#81b64c]"
        style={{ backgroundColor: checked ? "#81b64c" : theme.border.primary }}
      >
        <span className="absolute top-1 h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: checked ? "translateX(23px)" : "translateX(4px)" }} />
      </button>
    </div>
  );
}

function LinkButton({ children, onClick, theme }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
      style={{ borderColor: theme.border.secondary, backgroundColor: theme.bg.tertiary, color: theme.text.primary }}
    >
      {children}
    </button>
  );
}

export default function Settings({ user, onBack, onNavigate }) {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState("account");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const settingsApi = useSettings(user);
  const settings = settingsApi.settings;

  const supporterLabel = useMemo(() => {
    if (settings.premium.supporterStatus === "pending") return "Pending verification";
    if (settings.premium.supporterStatus === "supporter" || settings.premium.isSupporter) return "Supporter";
    if (settings.premium.supporterStatus === "rejected") return "Rejected";
    return "Free";
  }, [settings.premium]);

  useEffect(() => {
    if (!status) return undefined;
    const timer = window.setTimeout(() => setStatus(""), 3500);
    return () => window.clearTimeout(timer);
  }, [status]);

  const go = (page) => {
    if (onNavigate) onNavigate(page);
  };

  const save = async () => {
    if (!settingsApi.hasChanges || saving) return;
    setSaving(true);
    setStatus("");
    try {
      await settingsApi.saveSettings();
      notifyUserChanged();
      setStatus("Settings updated successfully.");
    } catch (error) {
      if (error.status === 401) setStatus("Session expired. Please sign in again.");
      else if (error.status === 403) setStatus("You do not have permission to update these settings.");
      else setStatus(error.message || "Unable to update settings.");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient("/api/auth/logout", { method: "POST", skipAuthRefresh: true });
    } catch {
      // Logout remains local-safe when the server session has already expired.
    } finally {
      localStorage.removeItem("user");
      sessionStorage.removeItem("chessplay_access_token");
      sessionStorage.removeItem("chessplay_socket_token");
      notifyUserChanged();
      window.location.href = "/login";
    }
  };

  if (!user || user.isGuest) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4" style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}>
        <Card title="Sign in required" description="Please sign in to manage your ChessPlay settings." theme={theme}>
          <div className="flex flex-wrap gap-3">
            <LinkButton theme={theme} onClick={() => { window.location.href = "/login"; }}>Go to login</LinkButton>
            <LinkButton theme={theme} onClick={onBack}>Back</LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  if (settingsApi.loading) {
    return (
      <div className="min-h-[70vh] p-4 md:p-8" style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}>
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-xl" style={{ backgroundColor: theme.bg.secondary }} />
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="h-80 animate-pulse rounded-2xl" style={{ backgroundColor: theme.bg.secondary }} />
            <div className="h-96 animate-pulse rounded-2xl" style={{ backgroundColor: theme.bg.secondary }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full p-4 md:p-8" style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button type="button" onClick={onBack} className="mb-3 text-sm font-semibold" style={{ color: theme.text.secondary }}>
              Back to dashboard
            </button>
            <h1 className="text-3xl font-black font-['Montserrat']">Settings</h1>
            <p className="mt-1 max-w-2xl text-sm" style={{ color: theme.text.secondary }}>
              Manage your account, privacy, notifications, appearance, and ChessPlay preferences.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status ? <span className="rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: theme.bg.secondary }}>{status}</span> : null}
            {settingsApi.error ? <span className="rounded-xl px-3 py-2 text-sm text-red-300" style={{ backgroundColor: theme.bg.secondary }}>{settingsApi.error}</span> : null}
            <button type="button" disabled={!settingsApi.hasChanges || saving} onClick={settingsApi.resetSettings} className="rounded-xl border px-4 py-2.5 font-bold disabled:opacity-50" style={{ borderColor: theme.border.secondary }}>
              Discard
            </button>
            <button type="button" disabled={!settingsApi.hasChanges || saving} onClick={save} className="rounded-xl bg-[#81b64c] px-4 py-2.5 font-black text-black disabled:opacity-50">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-2xl border p-2" style={panel(theme)} aria-label="Settings sections">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className="w-full rounded-xl px-4 py-3 text-left transition-colors"
                style={{
                  backgroundColor: activeSection === section.id ? theme.bg.tertiary : "transparent",
                  color: activeSection === section.id ? theme.text.primary : theme.text.secondary,
                }}
              >
                <span className="block font-black">{section.label}</span>
                <span className="mt-0.5 block text-xs" style={{ color: theme.text.tertiary }}>{section.helper}</span>
              </button>
            ))}
          </aside>

          <main className="space-y-5">
            {activeSection === "account" ? (
              <>
                <Card title="Account Settings" description="Your email is shown for account reference only. Email changes require a future verification flow." theme={theme}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label="Username" value={settings.profile.username} onChange={(value) => settingsApi.updateProfile("username", value)} theme={theme} helper="3–20 letters or numbers only." />
                    <TextField label="Email" value={settings.profile.email} onChange={() => {}} theme={theme} disabled helper="Email changes are disabled until verification is added." />
                    <TextField label="Country" value={settings.profile.country} onChange={(value) => settingsApi.updateProfile("country", value)} theme={theme} maxLength={56} />
                    <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: theme.bg.tertiary, color: theme.text.secondary }}>
                      Avatar upload is hidden here because production storage must be configured first. Your existing avatar stays unchanged.
                    </div>
                    <label className="md:col-span-2 block space-y-2 text-sm font-semibold">
                      <span>Bio</span>
                      <textarea
                        value={settings.profile.bio || ""}
                        onChange={(event) => settingsApi.updateProfile("bio", event.target.value)}
                        maxLength={500}
                        rows={4}
                        className="w-full resize-none rounded-xl px-3 py-2.5 outline-none"
                        style={{ backgroundColor: theme.bg.tertiary, border: `1px solid ${theme.border.secondary}`, color: theme.text.primary }}
                      />
                      <span className="text-xs font-normal" style={{ color: theme.text.tertiary }}>{(settings.profile.bio || "").length}/500 characters</span>
                    </label>
                  </div>
                </Card>
              </>
            ) : null}

            {activeSection === "privacy" ? (
              <Card title="Privacy Settings" description="Choose what other players can see and who can contact you." theme={theme}>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField label="Profile visibility" value={settings.privacy.profileVisibility} options={SELECTS.profileVisibility} onChange={(value) => settingsApi.updatePrivacy("profileVisibility", value)} theme={theme} />
                  <SelectField label="Game history visibility" value={settings.privacy.gameHistoryVisibility} options={SELECTS.gameHistoryVisibility} onChange={(value) => settingsApi.updatePrivacy("gameHistoryVisibility", value)} theme={theme} />
                  <SelectField label="Friend requests" value={settings.privacy.friendRequests} options={SELECTS.friendRequests} onChange={(value) => settingsApi.updatePrivacy("friendRequests", value)} theme={theme} />
                </div>
              </Card>
            ) : null}

            {activeSection === "notifications" ? (
              <Card title="Notification Settings" description="These preferences are saved now. Browser push notifications will be added later." theme={theme}>
                <div className="space-y-3">
                  <Toggle label="Game invites" description="Challenges and room invitations." checked={settings.notifications.gameInvites} onChange={(value) => settingsApi.updateNotifications("gameInvites", value)} theme={theme} />
                  <Toggle label="Friend requests" description="New and accepted friend requests." checked={settings.notifications.friendRequests} onChange={(value) => settingsApi.updateNotifications("friendRequests", value)} theme={theme} />
                  <Toggle label="Messages" description="New messages from ChessPlay friends." checked={settings.notifications.messages} onChange={(value) => settingsApi.updateNotifications("messages", value)} theme={theme} />
                  <Toggle label="Tournament updates" description="Tournament openings, starts, and results." checked={settings.notifications.tournaments} onChange={(value) => settingsApi.updateNotifications("tournaments", value)} theme={theme} />
                  <Toggle label="Community replies" description="Replies to feedback, bugs, and feature requests." checked={settings.notifications.community} onChange={(value) => settingsApi.updateNotifications("community", value)} theme={theme} />
                  <Toggle label="Supporter/payment updates" description="Manual verification and supporter status changes." checked={settings.notifications.supporter} onChange={(value) => settingsApi.updateNotifications("supporter", value)} theme={theme} />
                </div>
              </Card>
            ) : null}

            {activeSection === "appearance" ? (
              <Card title="Themes & Badges" description="Personalize ChessPlay with app themes, contrast-safe colors, board styles, and profile badges. These are cosmetic only and never affect gameplay." theme={theme}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <ThemeGrid
                    title="App themes"
                    items={APP_THEME_OPTIONS}
                    selected={settings.appearance.theme}
                    isLocked={(item) => isSupporterOnlyTheme(item.id) && !settings.premium.isSupporter}
                    onSelect={(item) => settingsApi.updateAppearance("theme", item.id)}
                    theme={theme}
                    lockedCopy="Support ChessPlay to unlock this premium app theme."
                  />
                  <ThemeGrid
                    title="Accent colors"
                    items={ACCENT_COLOR_OPTIONS}
                    selected={settings.appearance.accentColor || "default"}
                    isLocked={(item) => !item.free && !settings.premium.isSupporter}
                    onSelect={(item) => settingsApi.updateAppearance("accentColor", item.id)}
                    theme={theme}
                    swatchKey="value"
                    lockedCopy="Premium accent colors are supporter cosmetics."
                  />
                  <ThemeGrid
                    title="Text colors"
                    items={TEXT_COLOR_OPTIONS}
                    selected={settings.appearance.textColor || "default"}
                    isLocked={(item) => !item.free && !settings.premium.isSupporter}
                    onSelect={(item) => settingsApi.updateAppearance("textColor", item.id)}
                    theme={theme}
                    swatchKey="value"
                    lockedCopy="Text presets are contrast-safe supporter cosmetics."
                  />
                  <BoardThemeGrid
                    selected={settings.appearance.boardTheme}
                    isSupporter={settings.premium.isSupporter}
                    onSelect={(id) => settingsApi.updateAppearance("boardTheme", id)}
                    theme={theme}
                  />
                </div>
                <BadgeGrid
                  selected={settings.appearance.selectedBadge || settings.badges?.selected || "new-player"}
                  earned={settings.badges?.earned || []}
                  isSupporter={settings.premium.isSupporter}
                  onSelect={(id) => settingsApi.updateAppearance("selectedBadge", id)}
                  theme={theme}
                />
                <div className="rounded-2xl p-4" style={{ backgroundColor: theme.bg.tertiary }}>
                  <p className="font-black">Live preview</p>
                  <div className="mt-3 rounded-2xl border p-4" style={{ borderColor: theme.border.secondary, backgroundColor: theme.bg.secondary }}>
                    <p className="text-xl font-black" style={{ color: theme.primary }}>ChessPlay Premium Cosmetics</p>
                    <p className="mt-2 text-sm" style={{ color: theme.text.secondary }}>Themes, text colors, board styles, and badges are cosmetic. Free gameplay remains fully available.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border px-3 py-1 text-xs font-black" style={{ borderColor: theme.primary, color: theme.primary }}>{settings.appearance.selectedBadge || "new-player"}</span>
                      {settings.premium.isSupporter ? <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-black text-amber-300">Supporter unlocked</span> : <button type="button" onClick={() => go("premium")} className="rounded-full bg-[#81b64c] px-3 py-1 text-xs font-black text-[#101510]">Support ChessPlay to unlock cosmetics</button>}
                    </div>
                  </div>
                </div>
                <p className="rounded-xl p-3 text-sm" style={{ backgroundColor: theme.bg.tertiary, color: theme.text.secondary }}>
                  Premium settings never affect rating, move validation, leaderboard fairness, or chess gameplay. PayPal/UPI/Bank supporter verification stays in Premium/Billing.
                </p>
              </Card>
            ) : null}

            {activeSection === "gameplay" ? (
              <Card title="Gameplay Preferences" description="These defaults help new games start faster. Chess rules and move validation are unchanged." theme={theme}>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField label="Default play mode" value={settings.gameplay.defaultMode} options={SELECTS.defaultMode} onChange={(value) => settingsApi.updateGameplay("defaultMode", value)} theme={theme} />
                  <SelectField label="Default board orientation" value={settings.gameplay.boardOrientation} options={SELECTS.boardOrientation} onChange={(value) => settingsApi.updateGameplay("boardOrientation", value)} theme={theme} />
                  <SelectField label="Animation preference" value={settings.gameplay.animation} options={SELECTS.animation} onChange={(value) => settingsApi.updateGameplay("animation", value)} theme={theme} />
                </div>
                <div className="space-y-3">
                  <Toggle label="Move confirmation" description="Ask before submitting a move when supported by the board." checked={settings.gameplay.moveConfirmation} onChange={(value) => settingsApi.updateGameplay("moveConfirmation", value)} theme={theme} />
                  <Toggle label="Sound effects" description="Play game sounds when supported by the current mode." checked={settings.gameplay.soundEffects} onChange={(value) => settingsApi.updateGameplay("soundEffects", value)} theme={theme} />
                </div>
              </Card>
            ) : null}

            {activeSection === "premium" ? (
              <Card title="Supporter/Premium Settings" description="Supporter status is manually verified by admin. Nothing here changes gameplay fairness." theme={theme}>
                <div className="grid gap-3 md:grid-cols-3">
                  <StatusCard title="Current plan" value={supporterLabel} theme={theme} />
                  <StatusCard title="Supporter badge" value={settings.premium.isSupporter ? "Enabled" : "Not active"} theme={theme} />
                  <StatusCard title="Ads status" value={settings.premium.adsDisabled ? "Ads disabled" : "Ads enabled"} theme={theme} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <LinkButton theme={theme} onClick={() => go("pricing")}>Premium</LinkButton>
                  <LinkButton theme={theme} onClick={() => go("billing")}>Billing</LinkButton>
                  <LinkButton theme={theme} onClick={() => go("support")}>Support</LinkButton>
                </div>
              </Card>
            ) : null}

            {activeSection === "security" ? (
              <Card title="Security Settings" description="Use password reset for secure password changes. Active session management will be added after backend session revocation is available." theme={theme}>
                <div className="space-y-3">
                  <p className="rounded-xl p-3 text-sm" style={{ backgroundColor: theme.bg.tertiary, color: theme.text.secondary }}>
                    Password change and logout-all-devices are shown as coming soon here because they need complete backend safety and session revocation support.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <LinkButton theme={theme} onClick={() => { window.location.href = "/forgot-password"; }}>Reset password</LinkButton>
                    <LinkButton theme={theme} onClick={logout}>Logout</LinkButton>
                  </div>
                </div>
              </Card>
            ) : null}

            {activeSection === "danger" ? (
              <Card title="Danger Zone" description="Destructive actions are hidden until backend safety checks and account recovery policies are complete." theme={theme}>
                <p className="rounded-xl p-3 text-sm" style={{ backgroundColor: theme.bg.tertiary, color: theme.text.secondary }}>
                  Delete account is not enabled from this settings page. This prevents accidental destructive actions without a complete verification and recovery flow.
                </p>
              </Card>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}


function ThemeGrid({ title, items, selected, isLocked, onSelect, theme, swatchKey, lockedCopy }) {
  return (
    <section className="rounded-2xl border p-4" style={{ borderColor: theme.border.secondary, backgroundColor: theme.bg.tertiary }}>
      <h3 className="font-black">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const locked = isLocked(item);
          const active = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => !locked && onSelect(item)}
              disabled={locked}
              className="rounded-2xl border p-3 text-left transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              style={{ borderColor: active ? theme.primary : theme.border.secondary, backgroundColor: active ? theme.active : theme.bg.secondary }}
              aria-label={`${item.label}${locked ? " locked" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">{item.label}</p>
                  <p className="mt-1 text-xs" style={{ color: theme.text.secondary }}>{locked ? lockedCopy : item.description || "Ready to use."}</p>
                </div>
                {swatchKey ? <span className="h-6 w-6 rounded-full border" style={{ backgroundColor: item[swatchKey] || theme.primary, borderColor: theme.border.secondary }} /> : null}
              </div>
              <div className="mt-3 flex gap-2">
                {active ? <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-black text-emerald-300">Active</span> : null}
                {locked ? <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-black text-amber-300">Locked</span> : null}
                {item.supporter ? <span className="rounded-full bg-purple-500/15 px-2 py-1 text-[11px] font-black text-purple-300">Supporter</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BoardThemeGrid({ selected, isSupporter, onSelect, theme }) {
  const ids = [...FREE_BOARD_THEMES, ...SUPPORTER_BOARD_THEMES];
  return (
    <section className="rounded-2xl border p-4" style={{ borderColor: theme.border.secondary, backgroundColor: theme.bg.tertiary }}>
      <h3 className="font-black">Board themes</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {ids.map((id) => {
          const board = BOARD_THEMES[id];
          const locked = isSupporterOnlyBoard(id) && !isSupporter;
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => !locked && onSelect(id)}
              disabled={locked}
              className="rounded-2xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-70"
              style={{ borderColor: active ? theme.primary : theme.border.secondary, backgroundColor: theme.bg.secondary }}
            >
              <div className="grid grid-cols-4 overflow-hidden rounded-xl border" style={{ borderColor: board.border }}>
                {Array.from({ length: 8 }).map((_, index) => (
                  <span key={index} className="h-7" style={{ background: index % 2 ? board.dark : board.light }} />
                ))}
              </div>
              <p className="mt-3 font-black">{board.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {active ? <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-black text-emerald-300">Active</span> : null}
                {locked ? <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-black text-amber-300">Locked</span> : null}
                {isSupporterOnlyBoard(id) ? <span className="rounded-full bg-purple-500/15 px-2 py-1 text-[11px] font-black text-purple-300">Supporter</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BadgeGrid({ selected, earned, isSupporter, onSelect, theme }) {
  const earnedSet = new Set(earned || []);
  return (
    <section className="rounded-2xl border p-4" style={{ borderColor: theme.border.secondary, backgroundColor: theme.bg.tertiary }}>
      <h3 className="font-black">Impressive profile badges</h3>
      <p className="mt-1 text-sm" style={{ color: theme.text.secondary }}>Select only earned badges. Locked badges are previews, never fake rewards.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {BADGE_OPTIONS.map((badge) => {
          const supporterLocked = isSupporterOnlyBadge(badge.id) && !isSupporter;
          const earnedBadge = earnedSet.has(badge.id) || badge.free || (badge.supporter && isSupporter);
          const locked = supporterLocked || !earnedBadge;
          const active = selected === badge.id;
          return (
            <button
              key={badge.id}
              type="button"
              disabled={locked}
              onClick={() => !locked && onSelect(badge.id)}
              className="rounded-2xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-65"
              style={{ borderColor: active ? theme.primary : theme.border.secondary, backgroundColor: active ? theme.active : theme.bg.secondary }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full border px-3 py-1 text-xs font-black" style={{ borderColor: theme.primary, color: theme.primary }}>{badge.label}</span>
                <span className="text-[10px] font-black uppercase" style={{ color: theme.text.tertiary }}>{badge.rarity}</span>
              </div>
              <p className="mt-3 text-xs" style={{ color: theme.text.secondary }}>{locked ? "Locked until earned or supporter verified." : badge.description}</p>
              {active ? <p className="mt-2 text-xs font-black text-emerald-300">Selected</p> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StatusCard({ title, value, theme }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: theme.bg.tertiary }}>
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.text.tertiary }}>{title}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}
