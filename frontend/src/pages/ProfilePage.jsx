import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiClient } from "../services/apiClient";
import { useTheme } from "../hooks/useTheme";
import { notifyUserChanged } from "../hooks/useCurrentUser";

const LOCAL_FRIENDS_KEY = "chessplay.topbar.localFriends";
const TABS = ["overview", "games", "stats", "friends"];

function loadLocalFriends() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_FRIENDS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalFriends(friends) {
  localStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(friends));
}

function normalizeId(value) {
  return String(value?._id || value?.id || value || "");
}

function formatDate(date) {
  if (!date) return "Unknown";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getGameResult(game, userId) {
  const id = normalizeId(userId);
  if (game.result === "draw") return "Draw";
  if (normalizeId(game.winner) === id || normalizeId(game.winner?._id) === id) {
    return "Win";
  }
  return "Loss";
}

function getOpponent(game, userId) {
  const id = normalizeId(userId);
  if (game.aiOpponent) {
    return `Stockfish Lv${game.aiDifficulty || 10}`;
  }
  const isWhite = normalizeId(game.whitePlayer) === id;
  const opponent = isWhite ? game.blackPlayer : game.whitePlayer;
  return opponent?.username || "Unknown";
}

function buildRatingTrend(profile, games) {
  const base = profile?.rating || 1200;
  const completed = [...games].reverse().slice(-16);
  if (!completed.length) {
    return [{ label: "Now", rating: base }];
  }

  let rating = base - completed.length * 8;
  return completed.map((game, index) => {
    const result = getGameResult(game, profile?._id || profile?.id);
    rating += result === "Win" ? 14 : result === "Loss" ? -9 : 2;
    return {
      label: `G${index + 1}`,
      rating: Math.max(100, Math.round(rating)),
    };
  });
}

export default function Profile({ user, onBack, profileUserId = null }) {
  const { theme, isDark } = useTheme();
  const [profileData, setProfileData] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [friendsData, setFriendsData] = useState({ friends: [], requests: [] });
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    bio: "",
    avatar: "",
    country: "US",
  });
  const [profileViews, setProfileViews] = useState(0);

  const targetUserId = profileUserId || user?.id || user?._id;
  const isOwnProfile = !profileUserId || normalizeId(profileUserId) === normalizeId(user);

  const stats = useMemo(() => {
    const gamesPlayed = profileData?.gamesPlayed ?? recentGames.length;
    const wins = profileData?.gamesWon ?? 0;
    const losses = profileData?.gamesLost ?? 0;
    const draws = profileData?.gamesDrawn ?? 0;
    const decided = wins + losses + draws;
    const sourceGames = decided || recentGames.length;
    const winRate = sourceGames ? Math.round((wins / sourceGames) * 100) : 0;

    return {
      gamesPlayed,
      wins,
      losses,
      draws,
      winRate,
      rating: profileData?.rating || 1200,
      puzzleRating: profileData?.puzzleRating || 1200,
    };
  }, [profileData, recentGames.length]);

  const resultBars = useMemo(
    () => [
      { name: "Wins", value: stats.wins, color: "#81b64c" },
      { name: "Draws", value: stats.draws, color: "#9ca3af" },
      { name: "Losses", value: stats.losses, color: "#ef4444" },
    ],
    [stats],
  );

  const ratingTrend = useMemo(
    () => buildRatingTrend(profileData, recentGames),
    [profileData, recentGames],
  );

  const fetchFriends = useCallback(async () => {
    try {
      const data = await apiClient("/api/auth/friends");
      setFriendsData({
        friends: data.friends || [],
        requests: data.requests || [],
      });
    } catch (error) {
      if (error.status === 404) {
        setFriendsData({ friends: loadLocalFriends(), requests: [] });
        setStatus("Friends are local until you redeploy the backend with the new routes.");
        return;
      }
      setStatus(error.message);
    }
  }, []);

  const fetchProfileData = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const profileEndpoint = profileUserId
        ? `/api/auth/profile/${targetUserId}`
        : "/api/auth/profile";
      const [profileResponse, gamesResponse] = await Promise.all([
        apiClient(profileEndpoint),
        apiClient(
          `/api/games/history?page=1&limit=20&userId=${encodeURIComponent(targetUserId)}`,
        ).catch(() => ({ games: [] })),
      ]);

      const fetchedUser = profileResponse.user || profileResponse;
      setProfileData(fetchedUser);
      setRecentGames(gamesResponse.games || []);
      setForm({
        username: fetchedUser.username || "",
        email: fetchedUser.email || "",
        bio: fetchedUser.bio || "",
        avatar: fetchedUser.avatar || "",
        country: fetchedUser.country || "US",
      });
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }, [profileUserId, targetUserId]);

  useEffect(() => {
    fetchProfileData();
    fetchFriends();
  }, [fetchFriends, fetchProfileData]);

  useEffect(() => {
    if (!targetUserId) return;
    const key = `chessplay.profile.views.${targetUserId}`;
    const nextViews = Number(localStorage.getItem(key) || 0) + 1;
    localStorage.setItem(key, String(nextViews));
    setProfileViews(nextViews);
  }, [targetUserId]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const data = await apiClient("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      const updatedUser = data.user;
      setProfileData(updatedUser);
      setEditOpen(false);

      if (isOwnProfile) {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...storedUser,
            id: updatedUser._id || storedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
          }),
        );
        notifyUserChanged();
      }
      setStatus("Profile updated.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  };

  const acceptRequest = async (requestId, action) => {
    try {
      await apiClient("/api/auth/friends/respond", {
        method: "POST",
        body: JSON.stringify({ requestId, action }),
      });
      setStatus(action === "accept" ? "Friend added." : "Request declined.");
      fetchFriends();
    } catch (error) {
      setStatus(error.message);
    }
  };

  const removeLocalFriend = (friendId) => {
    const next = friendsData.friends.filter(
      (friend) => normalizeId(friend.id) !== normalizeId(friendId),
    );
    saveLocalFriends(next);
    setFriendsData((data) => ({ ...data, friends: next }));
    setStatus("Local friend removed.");
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-4 rounded-full border-4 border-[#81b64c] border-t-transparent animate-spin" />
          <p style={{ color: theme.text.secondary }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Profile not found</h1>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-4 py-2 font-semibold"
            style={{ backgroundColor: theme.primary, color: isDark ? "#000" : "#fff" }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const panelStyle = {
    backgroundColor: theme.bg.secondary,
    borderColor: theme.border.secondary,
    color: theme.text.primary,
  };

  return (
    <div
      className="min-h-full w-full p-4 md:p-8 space-y-6"
      style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}
    >
      <section className="overflow-hidden rounded-xl border shadow-lg" style={panelStyle}>
        <div className="h-32 md:h-40 relative bg-[#4b6838]">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "linear-gradient(45deg, rgba(255,255,255,.16) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,.16) 25%, transparent 25%)",
              backgroundSize: "28px 28px",
            }}
          />
          <button
            type="button"
            onClick={onBack}
            className="absolute left-4 top-4 rounded-lg px-3 py-2 text-sm font-semibold text-white bg-black/30 hover:bg-black/40"
          >
            Back
          </button>
        </div>

        <div className="px-4 md:px-6 pb-6">
          <div className="flex flex-col lg:flex-row gap-5 lg:items-end -mt-12">
            <div className="h-28 w-28 rounded-xl border-4 overflow-hidden shadow-xl flex items-center justify-center text-4xl font-black bg-[#262421] border-[#262421]">
              {profileData.avatar ? (
                <img
                  src={profileData.avatar}
                  alt={profileData.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{profileData.username?.charAt(0)?.toUpperCase() || "U"}</span>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-2 lg:pt-0">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="min-w-0">
                  <h1 className="text-3xl font-black truncate font-['Montserrat']">
                    {profileData.username}
                  </h1>
                  <p className="text-sm mt-1" style={{ color: theme.text.secondary }}>
                    {profileData.bio || "Chess player"}
                  </p>
                </div>
                {profileData.title && (
                  <span className="w-fit rounded-md px-2 py-1 text-xs font-black bg-yellow-400 text-black">
                    {profileData.title}
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  ["Rating", stats.rating],
                  ["Games", stats.gamesPlayed],
                  ["Win rate", `${stats.winRate}%`],
                  ["Friends", friendsData.friends.length],
                  ["Views", profileViews],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border px-3 py-2" style={panelStyle}>
                    <div className="text-xs uppercase tracking-wide" style={{ color: theme.text.tertiary }}>
                      {label}
                    </div>
                    <div className="text-xl font-black mt-1">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setEditOpen((open) => !open)}
                className="rounded-lg px-5 py-3 font-bold lg:mb-1"
                style={{ backgroundColor: theme.primary, color: isDark ? "#000" : "#fff" }}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </section>

      {status && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={panelStyle}>
          {status}
        </div>
      )}

      {editOpen && (
        <form
          onSubmit={saveProfile}
          className="rounded-xl border p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
          style={panelStyle}
        >
          <label className="space-y-2 text-sm font-semibold">
            <span>Username</span>
            <input
              value={form.username}
              onChange={(e) => setForm((current) => ({ ...current, username: e.target.value }))}
              className="w-full rounded-lg px-3 py-2 outline-none"
              style={{ backgroundColor: theme.bg.tertiary, border: `1px solid ${theme.border.secondary}` }}
            />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
              className="w-full rounded-lg px-3 py-2 outline-none"
              style={{ backgroundColor: theme.bg.tertiary, border: `1px solid ${theme.border.secondary}` }}
            />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            <span>Avatar URL</span>
            <input
              value={form.avatar}
              onChange={(e) => setForm((current) => ({ ...current, avatar: e.target.value }))}
              className="w-full rounded-lg px-3 py-2 outline-none"
              style={{ backgroundColor: theme.bg.tertiary, border: `1px solid ${theme.border.secondary}` }}
            />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            <span>Country</span>
            <input
              value={form.country}
              maxLength={2}
              onChange={(e) => setForm((current) => ({ ...current, country: e.target.value.toUpperCase() }))}
              className="w-full rounded-lg px-3 py-2 outline-none uppercase"
              style={{ backgroundColor: theme.bg.tertiary, border: `1px solid ${theme.border.secondary}` }}
            />
          </label>
          <label className="space-y-2 text-sm font-semibold md:col-span-2">
            <span>Bio</span>
            <textarea
              value={form.bio}
              maxLength={500}
              onChange={(e) => setForm((current) => ({ ...current, bio: e.target.value }))}
              rows={3}
              className="w-full rounded-lg px-3 py-2 outline-none resize-none"
              style={{ backgroundColor: theme.bg.tertiary, border: `1px solid ${theme.border.secondary}` }}
            />
          </label>
          <div className="md:col-span-2 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold border"
              style={{ borderColor: theme.border.secondary }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg px-4 py-2 font-bold disabled:opacity-60"
              style={{ backgroundColor: theme.primary, color: isDark ? "#000" : "#fff" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      <nav className="flex gap-2 overflow-x-auto border-b" style={{ borderColor: theme.border.secondary }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="px-4 py-3 text-sm font-bold capitalize border-b-2 transition-colors"
            style={{
              borderColor: activeTab === tab ? theme.primary : "transparent",
              color: activeTab === tab ? theme.text.primary : theme.text.secondary,
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="xl:col-span-2 rounded-xl border p-5" style={panelStyle}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black">Rating</h2>
              <span className="text-sm" style={{ color: theme.text.secondary }}>
                Recent trend
              </span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ratingTrend} margin={{ left: -16, right: 12, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke={theme.border.secondary} vertical={false} />
                  <XAxis dataKey="label" stroke={theme.text.tertiary} tickLine={false} axisLine={false} />
                  <YAxis stroke={theme.text.tertiary} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.bg.secondary,
                      border: `1px solid ${theme.border.secondary}`,
                      borderRadius: 8,
                    }}
                  />
                  <Line type="monotone" dataKey="rating" stroke="#81b64c" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border p-5" style={panelStyle}>
            <h2 className="text-xl font-black mb-4">Snapshot</h2>
            <div className="space-y-3">
              {[
                ["Member since", formatDate(profileData.createdAt)],
                ["Country", profileData.country || "US"],
                ["Puzzle rating", stats.puzzleRating],
                ["Highest puzzle", profileData.highestPuzzleRating || 1200],
                ["Puzzles solved", profileData.puzzlesSolved || 0],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span style={{ color: theme.text.secondary }}>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === "games" && (
        <section className="rounded-xl border overflow-hidden" style={panelStyle}>
          <div className="p-5 border-b" style={{ borderColor: theme.border.secondary }}>
            <h2 className="text-xl font-black">Games</h2>
          </div>
          {recentGames.length === 0 ? (
            <div className="p-8 text-center" style={{ color: theme.text.secondary }}>
              No games played yet.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: theme.border.secondary }}>
              {recentGames.map((game) => {
                const result = getGameResult(game, targetUserId);
                const resultColor =
                  result === "Win" ? "#81b64c" : result === "Loss" ? "#ef4444" : "#9ca3af";
                return (
                  <div key={game._id || game.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold">vs {getOpponent(game, targetUserId)}</div>
                      <div className="text-sm" style={{ color: theme.text.secondary }}>
                        {formatDate(game.endTime || game.startTime)} · {game.timeControl || "Casual"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black" style={{ color: resultColor }}>
                        {result}
                      </span>
                      <span className="text-sm" style={{ color: theme.text.tertiary }}>
                        {game.moves?.length || 0} moves
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "stats" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border p-5" style={panelStyle}>
            <h2 className="text-xl font-black mb-4">Results</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resultBars}>
                  <CartesianGrid stroke={theme.border.secondary} vertical={false} />
                  <XAxis dataKey="name" stroke={theme.text.tertiary} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke={theme.text.tertiary} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.bg.secondary,
                      border: `1px solid ${theme.border.secondary}`,
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {resultBars.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border p-5" style={panelStyle}>
            <h2 className="text-xl font-black mb-4">Performance</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Wins", stats.wins],
                ["Losses", stats.losses],
                ["Draws", stats.draws],
                ["Win rate", `${stats.winRate}%`],
                ["Rating", stats.rating],
                ["Games", stats.gamesPlayed],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg p-4" style={{ backgroundColor: theme.bg.tertiary }}>
                  <div className="text-xs uppercase tracking-wide" style={{ color: theme.text.tertiary }}>
                    {label}
                  </div>
                  <div className="text-2xl font-black mt-1">{value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === "friends" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border p-5" style={panelStyle}>
            <h2 className="text-xl font-black mb-4">Friends</h2>
            {friendsData.friends.length === 0 ? (
              <p style={{ color: theme.text.secondary }}>
                No friends yet. Use the Friends button in the top bar to search and add players.
              </p>
            ) : (
              <div className="space-y-3">
                {friendsData.friends.map((friend) => (
                  <div
                    key={friend.id || friend._id || friend.username}
                    className="rounded-lg p-3 flex items-center justify-between gap-3"
                    style={{ backgroundColor: theme.bg.tertiary }}
                  >
                    <div className="min-w-0">
                      <div className="font-bold truncate">{friend.username}</div>
                      <div className="text-sm" style={{ color: theme.text.secondary }}>
                        {friend.rating || 1200} rating · {friend.gamesPlayed || 0} games
                      </div>
                    </div>
                    {friend.localOnly && (
                      <button
                        type="button"
                        onClick={() => removeLocalFriend(friend.id)}
                        className="rounded-md border px-3 py-1.5 text-sm font-semibold"
                        style={{ borderColor: theme.border.secondary }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border p-5" style={panelStyle}>
            <h2 className="text-xl font-black mb-4">Requests</h2>
            {friendsData.requests.length === 0 ? (
              <p style={{ color: theme.text.secondary }}>No pending requests.</p>
            ) : (
              <div className="space-y-3">
                {friendsData.requests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-lg p-3 flex items-center justify-between gap-3"
                    style={{ backgroundColor: theme.bg.tertiary }}
                  >
                    <div>
                      <div className="font-bold">{request.from?.username}</div>
                      <div className="text-sm" style={{ color: theme.text.secondary }}>
                        Wants to connect
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => acceptRequest(request.id, "accept")}
                        className="rounded-md px-3 py-1.5 text-sm font-bold bg-[#81b64c] text-black"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => acceptRequest(request.id, "decline")}
                        className="rounded-md border px-3 py-1.5 text-sm font-semibold"
                        style={{ borderColor: theme.border.secondary }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
