import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../services/apiClient";
import { useTheme } from "../hooks/useTheme";
import { notifyUserChanged } from "../hooks/useCurrentUser";

const TABS = ["overview", "games", "badges", "supporter"];

function initials(name = "U") {
  return String(name || "U").trim().slice(0, 2).toUpperCase();
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getPlanLabel(profile) {
  if (!profile) return "Free";
  if (profile.isSupporter || profile.isPremium || profile.plan === "Supporter") return "Supporter";
  if (profile.planStatus === "pending" || profile.plan === "Pending verification") return "Pending verification";
  if (profile.planStatus === "cancelled" || profile.planStatus === "expired" || profile.plan === "Rejected") return "Rejected";
  return "Free";
}

function Badge({ children, tone = "neutral" }) {
  const tones = {
    supporter: "bg-amber-400/15 text-amber-300 border-amber-400/30",
    admin: "bg-purple-400/15 text-purple-300 border-purple-400/30",
    good: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    info: "bg-sky-400/15 text-sky-300 border-sky-400/30",
    neutral: "bg-white/10 text-white/80 border-white/15",
  };
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${tones[tone] || tones.neutral}`}>{children}</span>;
}

function StatCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs text-white/50">{helper}</p> : null}
    </div>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
      <p className="text-lg font-black text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export default function Profile({ user, username = null, onBack, onNavigate }) {
  const { theme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", bio: "", country: "" });

  const isOwnProfile = !username;
  const planLabel = getPlanLabel(profile);
  const isSupporter = Boolean(profile?.isSupporter || profile?.isPremium || planLabel === "Supporter");
  const gamesPlayed = Number(profile?.gamesPlayed || 0);
  const wins = Number(profile?.wins ?? profile?.gamesWon ?? 0);
  const losses = Number(profile?.losses ?? profile?.gamesLost ?? 0);
  const draws = Number(profile?.draws ?? profile?.gamesDrawn ?? 0);
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

  const changed = useMemo(() => {
    if (!profile) return false;
    return (
      form.username.trim() !== String(profile.username || "") ||
      form.bio.trim() !== String(profile.bio || "") ||
      form.country.trim() !== String(profile.country || "")
    );
  }, [form, profile]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const endpoint = username ? `/api/profile/${encodeURIComponent(username)}` : "/api/profile/me";
      const options = username ? { skipAuthRefresh: true } : {};
      const data = await apiClient(endpoint, options);
      const nextProfile = data.profile || data.user || data;
      setProfile(nextProfile);
      setRecentGames(Array.isArray(data.recentGames) ? data.recentGames : []);
      setForm({
        username: nextProfile.username || "",
        bio: nextProfile.bio || "",
        country: nextProfile.country || "",
      });
    } catch (err) {
      if (err.status === 401) setError("Session expired. Please sign in again.");
      else if (err.status === 403) setError(err.message || "This profile is private.");
      else if (err.status === 404) setError("Profile not found.");
      else setError("Unable to reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!changed || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const data = await apiClient("/api/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          username: form.username.trim(),
          bio: form.bio.trim(),
          country: form.country.trim(),
        }),
      });
      const nextProfile = data.profile;
      setProfile(nextProfile);
      setRecentGames(Array.isArray(data.recentGames) ? data.recentGames : recentGames);
      setForm({ username: nextProfile.username || "", bio: nextProfile.bio || "", country: nextProfile.country || "" });
      setEditing(false);
      setNotice("Profile updated successfully.");
      if (isOwnProfile) {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...stored, username: nextProfile.username, avatar: nextProfile.avatar }));
        notifyUserChanged();
      }
    } catch (err) {
      setError(err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const go = (page) => {
    if (typeof onNavigate === "function") onNavigate(page);
  };

  if (loading) {
    return (
      <main className="min-h-[80vh] w-full p-4 md:p-8" style={{ backgroundColor: theme.bg.primary }}>
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="h-56 animate-pulse rounded-3xl bg-white/10" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-white/10" />)}
          </div>
        </div>
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main className="min-h-[80vh] w-full p-4 md:p-8" style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}>
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-black">Player Profile</h1>
          <p className="mt-3 text-white/65">{error}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={loadProfile} className="rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#101510]">Retry</button>
            <button type="button" onClick={onBack || (() => go("dashboard"))} className="rounded-xl border border-white/15 px-5 py-3 font-bold text-white">Back</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full w-full p-4 md:p-8" style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl">
          <div className="relative min-h-44 bg-gradient-to-br from-[#81b64c] via-[#4b6838] to-[#1f2937] p-5">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0 2px, transparent 2px)", backgroundSize: "28px 28px" }} />
            <button type="button" onClick={onBack || (() => go("dashboard"))} className="relative z-10 rounded-xl bg-black/25 px-4 py-2 text-sm font-bold text-white hover:bg-black/35" aria-label="Go back from profile">← Back</button>
          </div>

          <div className="px-5 pb-6 md:px-7">
            <div className="-mt-14 flex flex-col gap-5 lg:flex-row lg:items-end">
              <div className="relative z-10 flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-4 border-[#111827] bg-[#263421] text-4xl font-black text-white shadow-xl">
                {profile?.avatar ? <img src={profile.avatar} alt={`${profile.username} avatar`} className="h-full w-full object-cover" /> : initials(profile?.username)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <h1 className="truncate text-3xl font-black text-white md:text-4xl">{profile?.username || "ChessPlay Player"}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-white/65">{profile?.bio || "Chess player on ChessPlay."}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isSupporter ? <Badge tone="supporter">Supporter</Badge> : <Badge>Free</Badge>}
                    {profile?.isAdmin ? <Badge tone="admin">Admin</Badge> : null}
                    {gamesPlayed > 0 ? <Badge tone="good">Active Player</Badge> : <Badge tone="info">New Player</Badge>}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-6">
                  <StatCard label="Rating" value={profile?.rating || "Unrated"} />
                  <StatCard label="Games" value={gamesPlayed || 0} />
                  <StatCard label="Wins" value={wins} />
                  <StatCard label="Losses" value={losses} />
                  <StatCard label="Draws" value={draws} />
                  <StatCard label="Win rate" value={gamesPlayed ? `${winRate}%` : "No games"} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {(notice || error) && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${notice ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-red-400/30 bg-red-400/10 text-red-100"}`}>
            {notice || error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4" role="tablist" aria-label="Profile sections">
              {TABS.map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-sm font-bold capitalize transition ${activeTab === tab ? "bg-[#81b64c] text-[#101510]" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="mt-5 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-white/[0.04] p-4">
                    <h2 className="text-lg font-black text-white">Profile details</h2>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-4"><dt className="text-white/50">Joined</dt><dd className="font-bold text-white">{formatDate(profile?.joinedAt || profile?.createdAt)}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-white/50">Country</dt><dd className="font-bold text-white">{profile?.country || "Not set"}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-white/50">Current plan</dt><dd className="font-bold text-white">{planLabel}</dd></div>
                      {isOwnProfile && <div className="flex justify-between gap-4"><dt className="text-white/50">Email</dt><dd className="truncate font-bold text-white">{profile?.email || "Not available"}</dd></div>}
                    </dl>
                  </div>
                  <div className="rounded-2xl bg-white/[0.04] p-4">
                    <h2 className="text-lg font-black text-white">Fair-play supporter note</h2>
                    <p className="mt-3 text-sm text-white/60">Supporter status never affects rating, pairing, or gameplay fairness. ChessPlay keeps core chess features free.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {!isSupporter && <button type="button" onClick={() => go("monetization")} className="rounded-xl bg-[#81b64c] px-4 py-2 text-sm font-black text-[#101510]">Support ChessPlay</button>}
                      {isOwnProfile && <button type="button" onClick={() => go("billing")} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white">View billing status</button>}
                    </div>
                  </div>
                </div>

                {isOwnProfile && (
                  <div className="rounded-2xl bg-white/[0.04] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-lg font-black text-white">Edit profile</h2>
                        <p className="text-sm text-white/55">Update public profile text. Email and roles are managed separately for security.</p>
                      </div>
                      <button type="button" onClick={() => setEditing((value) => !value)} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white">{editing ? "Close editor" : "Edit profile"}</button>
                    </div>

                    {editing && (
                      <form onSubmit={saveProfile} className="mt-5 grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-bold text-white">
                          <span>Username</span>
                          <input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} minLength={3} maxLength={20} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none focus:border-[#81b64c]" />
                          <span className="text-xs font-normal text-white/45">3–20 letters, numbers, or underscores.</span>
                        </label>
                        <label className="space-y-2 text-sm font-bold text-white">
                          <span>Country / region</span>
                          <input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} maxLength={56} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none focus:border-[#81b64c]" />
                        </label>
                        <label className="space-y-2 text-sm font-bold text-white md:col-span-2">
                          <span>Bio</span>
                          <textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} maxLength={500} rows={4} className="w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none focus:border-[#81b64c]" />
                          <span className="text-xs font-normal text-white/45">{form.bio.length}/500 characters</span>
                        </label>
                        <div className="flex flex-wrap gap-3 md:col-span-2">
                          <button type="submit" disabled={!changed || saving} className="rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#101510] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button>
                          <button type="button" disabled={saving} onClick={() => { setForm({ username: profile.username || "", bio: profile.bio || "", country: profile.country || "" }); setEditing(false); }} className="rounded-xl border border-white/15 px-5 py-3 font-bold text-white disabled:opacity-50">Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "games" && (
              <div className="mt-5 space-y-3">
                {recentGames.length === 0 ? (
                  <EmptyState title={profile?.gameHistoryHidden ? "Game history is private" : "No games played yet."} description={profile?.gameHistoryHidden ? "This player has chosen not to show game history publicly." : "Completed games will appear here when real history is available."} />
                ) : recentGames.map((game) => (
                  <article key={game.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black text-white">vs {game.opponent}</p>
                      <p className="text-sm text-white/50">{formatDate(game.startedAt)} • {game.moves} moves</p>
                    </div>
                    <Badge tone={game.result === "Win" ? "good" : game.result === "Loss" ? "neutral" : "info"}>{game.result}</Badge>
                  </article>
                ))}
              </div>
            )}

            {activeTab === "badges" && (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><Badge tone={isSupporter ? "supporter" : "neutral"}>{isSupporter ? "Supporter" : "Free Player"}</Badge><p className="mt-3 text-sm text-white/60">{isSupporter ? "Thank you for supporting ChessPlay." : "Support ChessPlay to display a supporter badge."}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><Badge tone={profile?.isAdmin ? "admin" : "neutral"}>{profile?.isAdmin ? "Admin" : "Player"}</Badge><p className="mt-3 text-sm text-white/60">Admin badges are shown only from verified backend account roles.</p></div>
              </div>
            )}

            {activeTab === "supporter" && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-xl font-black text-white">Supporter status</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <StatCard label="Plan" value={planLabel} />
                  <StatCard label="Ads" value={profile?.adsDisabled ? "Disabled" : "Enabled"} />
                  <StatCard label="Fair play" value="Unaffected" helper="No rating boost" />
                </div>
                <p className="mt-4 text-sm text-white/60">Supporter requests are manually verified by admin. Supporter status never affects rating or gameplay fairness.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={() => go("monetization")} className="rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#101510]">View Premium</button>
                  {isOwnProfile && <button type="button" onClick={() => go("billing")} className="rounded-xl border border-white/15 px-5 py-3 font-bold text-white">Billing status</button>}
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-xl font-black text-white">Quick actions</h2>
              <div className="mt-4 grid gap-3">
                {isOwnProfile && <button type="button" onClick={() => go("settings")} className="rounded-xl border border-white/15 px-4 py-3 text-left font-bold text-white hover:bg-white/5">Account settings</button>}
                {isOwnProfile && <button type="button" onClick={() => go("messages")} className="rounded-xl border border-white/15 px-4 py-3 text-left font-bold text-white hover:bg-white/5">Messages</button>}
                {!isOwnProfile && user && <button type="button" onClick={() => go("messages")} className="rounded-xl border border-white/15 px-4 py-3 text-left font-bold text-white hover:bg-white/5">Message player</button>}
                <button type="button" onClick={() => go("leaderboard")} className="rounded-xl border border-white/15 px-4 py-3 text-left font-bold text-white hover:bg-white/5">Leaderboard</button>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-xl font-black text-white">Privacy</h2>
              <p className="mt-3 text-sm text-white/60">Profile and game history visibility are controlled in Settings. Public profiles never expose private email addresses.</p>
              {isOwnProfile && <button type="button" onClick={() => go("settings")} className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">Manage privacy</button>}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
