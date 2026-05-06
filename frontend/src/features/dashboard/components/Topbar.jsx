import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "../../../hooks/useTheme";
import { apiClient } from "../../../services/apiClient";

const STORAGE_KEYS = {
  messages: "chessplay.topbar.messages",
  notifications: "chessplay.topbar.notifications",
  localFriends: "chessplay.topbar.localFriends",
};

function loadStoredList(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export default function Topbar({ onMenuClick, user, onNavigate, onLogout }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [friendsData, setFriendsData] = useState({ friends: [], requests: [] });
  const [localFriends, setLocalFriends] = useState(() =>
    loadStoredList(STORAGE_KEYS.localFriends, []),
  );
  const [friendQuery, setFriendQuery] = useState("");
  const [friendResults, setFriendResults] = useState([]);
  const [friendStatus, setFriendStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [messages, setMessages] = useState(() =>
    loadStoredList(STORAGE_KEYS.messages, [
      {
        id: "welcome",
        from: "ChessPlay",
        text: "Welcome. Challenge a friend after they accept your request.",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]),
  );
  const [notifications, setNotifications] = useState(() =>
    loadStoredList(STORAGE_KEYS.notifications, [
      {
        id: "secure-login",
        title: "Login security enabled",
        text: "Protected routes require a valid session token.",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]),
  );
  const [messageDraft, setMessageDraft] = useState("");
  const dropdownRef = useRef(null);
  const panelRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const { isDark, toggleTheme, theme } = useTheme();

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : "U";

  const fallbackUserSearch = useCallback(async (query) => {
    const normalizedQuery = query.toLowerCase();
    const data = await apiClient("/api/games/leaderboard?limit=50");
    const list = data.leaderboard || data.users || data || [];
    return list
      .filter((candidate) =>
        String(candidate.username || "")
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 10)
      .map((candidate) => ({
        id: candidate._id || candidate.id || candidate.username,
        username: candidate.username,
        email: candidate.email || "",
        rating: candidate.rating || 1200,
        gamesPlayed: candidate.gamesPlayed || 0,
        gamesWon: candidate.gamesWon || 0,
        relationship: localFriends.some(
          (friend) => String(friend.id) === String(candidate._id || candidate.id || candidate.username),
        )
          ? "friend"
          : "none",
        fallback: true,
      }));
  }, [localFriends]);

  const searchUsers = async (query) => {
    try {
      const data = await apiClient(
        `/api/auth/users/search?q=${encodeURIComponent(query)}`,
      );
      return data.users || [];
    } catch (error) {
      if (error.status === 404) {
        return fallbackUserSearch(query);
      }
      throw error;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setActivePanel(null);
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.localFriends, JSON.stringify(localFriends));
  }, [localFriends]);

  const loadFriends = async () => {
    try {
      const data = await apiClient("/api/auth/friends");
      setFriendsData({
        friends: [...(data.friends || []), ...localFriends],
        requests: data.requests || [],
      });
    } catch (error) {
      if (error.status === 404) {
        setFriendsData({ friends: localFriends, requests: [] });
        setFriendStatus("Using local friends until the latest backend is deployed.");
        return;
      }
      setFriendStatus(error.message);
    }
  };

  useEffect(() => {
    if (activePanel !== "friends" || friendQuery.trim().length < 2) {
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const data = await apiClient(
          `/api/auth/users/search?q=${encodeURIComponent(friendQuery.trim())}`,
        );
        setFriendResults(data.users || []);
        setFriendStatus("");
      } catch (error) {
        if (error.status === 404) {
          try {
            const users = await fallbackUserSearch(friendQuery.trim());
            setFriendResults(users);
            setFriendStatus(
              "Search is using leaderboard fallback. Deploy the latest backend to enable friend requests.",
            );
          } catch (fallbackError) {
            setFriendStatus(fallbackError.message);
          }
          return;
        }
        setFriendStatus(error.message);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [activePanel, friendQuery, fallbackUserSearch]);

  const addLocalFriend = (result) => {
    const friend = {
      id: result.id,
      username: result.username,
      email: result.email || "",
      rating: result.rating || 1200,
      gamesPlayed: result.gamesPlayed || 0,
      gamesWon: result.gamesWon || 0,
      localOnly: true,
    };

    setLocalFriends((items) => {
      if (items.some((item) => String(item.id) === String(friend.id))) {
        return items;
      }
      return [...items, friend];
    });
    setFriendsData((data) => ({
      ...data,
      friends: data.friends.some((item) => String(item.id) === String(friend.id))
        ? data.friends
        : [...data.friends, friend],
    }));
    setFriendResults((results) =>
      results.map((item) =>
        String(item.id) === String(friend.id)
          ? { ...item, relationship: "friend" }
          : item,
      ),
    );
    setFriendStatus(`${friend.username} added locally.`);
  };

  const sendFriendRequest = async (target) => {
    if (target.fallback) {
      addLocalFriend(target);
      return;
    }

    try {
      await apiClient("/api/auth/friends/request", {
        method: "POST",
        body: JSON.stringify({ userId: target.id }),
      });
      setFriendStatus("Friend request sent.");
      setFriendResults((results) =>
        results.map((item) =>
          item.id === target.id ? { ...item, relationship: "pending" } : item,
        ),
      );
    } catch (error) {
      if (error.status === 404) {
        addLocalFriend(target);
        return;
      }
      setFriendStatus(error.message);
    }
  };

  const respondToRequest = async (requestId, action) => {
    try {
      await apiClient("/api/auth/friends/respond", {
        method: "POST",
        body: JSON.stringify({ requestId, action }),
      });
      setFriendStatus(action === "accept" ? "Friend added." : "Request declined.");
      loadFriends();
    } catch (error) {
      setFriendStatus(error.message);
    }
  };

  const sendLocalMessage = () => {
    const text = messageDraft.trim();
    if (!text) return;
    setMessages((items) => [
      {
        id: `${Date.now()}`,
        from: user?.username || "You",
        text,
        read: true,
        createdAt: new Date().toISOString(),
      },
      ...items,
    ]);
    setMessageDraft("");
  };

  const unreadMessages = messages.filter((message) => !message.read).length;
  const unreadNotifications = notifications.filter((item) => !item.read).length;

  const openPanel = (panel) => {
    setActivePanel((current) => (current === panel ? null : panel));
    if (panel === "friends") {
      loadFriends();
    }
    if (panel === "messages") {
      setMessages((items) => items.map((message) => ({ ...message, read: true })));
    }
    if (panel === "notifications") {
      setNotifications((items) =>
        items.map((notification) => ({ ...notification, read: true })),
      );
    }
  };

  const handleTopbarSearch = (value) => {
    setSearchQuery(value);
    setSearchStatus("");
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    window.clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const users = await searchUsers(value.trim());
        setSearchResults(users);
        if (users.some((item) => item.fallback)) {
          setSearchStatus("Showing leaderboard matches until backend search is deployed.");
        }
      } catch (error) {
        setSearchResults([]);
        setSearchStatus(error.message);
      }
    }, 250);
  };

  return (
    <header
      className="px-4 flex items-center justify-between flex-shrink-0 z-30 shadow-md sticky top-0 h-20 transition-colors duration-300"
      style={{
        backgroundColor: theme.bg.overlay,
        borderBottomColor: theme.border.secondary,
        color: theme.text.primary,
        borderBottom: `1px solid ${theme.border.secondary}`,
      }}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg transition-colors md:hidden flex items-center justify-center"
          style={{
            color: theme.text.secondary,
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.hover;
            e.currentTarget.style.color = theme.text.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = theme.text.secondary;
          }}
          aria-label="Open menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Mobile Logo (Hidden on Desktop since Sidebar has it) */}
        <div
          className="text-2xl font-black flex items-center gap-2 font-['Montserrat'] md:hidden"
          style={{ color: theme.text.primary }}
        >
          <span style={{ color: theme.primary }} className="flex-shrink-0">
            ♟
          </span>
          <span className="hidden sm:block">ChessPlay</span>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex items-center relative w-full max-w-md">
          <div
            className="absolute left-3"
            style={{ color: theme.text.tertiary }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleTopbarSearch(e.target.value)}
            placeholder="Search players..."
            className="w-full text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none transition-all font-medium"
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.03)",
              borderColor: theme.border.secondary,
              border: `1px solid ${theme.border.secondary}`,
              color: theme.text.primary,
              focusBorderColor: theme.primary,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = theme.primary;
              e.target.style.backgroundColor = isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.05)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = theme.border.secondary;
              e.target.style.backgroundColor = isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.03)";
            }}
          />
          {(searchQuery.trim().length >= 2 || searchStatus) && (
            <div
              className="absolute left-0 right-0 top-12 z-50 rounded-xl border shadow-2xl overflow-hidden"
              style={{
                backgroundColor: theme.bg.secondary,
                borderColor: theme.border.secondary,
              }}
            >
              {searchStatus && (
                <div
                  className="px-3 py-2 text-xs"
                  style={{ color: theme.text.tertiary }}
                >
                  {searchStatus}
                </div>
              )}
              {searchResults.length === 0 && !searchStatus ? (
                <div
                  className="px-3 py-3 text-sm"
                  style={{ color: theme.text.secondary }}
                >
                  No players found.
                </div>
              ) : (
                searchResults.map((result) => (
                  <button
                    type="button"
                    key={`${result.id}-${result.username}`}
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      onNavigate?.("leaderboard");
                    }}
                    className="w-full px-3 py-2 text-left transition-colors"
                    style={{ color: theme.text.primary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {result.username}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: theme.text.tertiary }}
                        >
                          {result.rating} rating · {result.gamesPlayed || 0} games
                        </div>
                      </div>
                      <span
                        className="text-xs"
                        style={{ color: theme.text.tertiary }}
                      >
                        Player
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 relative" ref={panelRef}>
        {/* Friends Icon */}
        <button
          onClick={() => openPanel("friends")}
          className="p-2 rounded-lg transition-colors relative"
          style={{
            color: theme.text.secondary,
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.hover;
            e.currentTarget.style.color = theme.text.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = theme.text.secondary;
          }}
          title="Friends"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          {friendsData.requests.length > 0 && (
            <span
              className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full text-[10px] leading-4 text-center font-bold"
              style={{ backgroundColor: theme.primary, color: isDark ? "#000" : "#fff" }}
            >
              {friendsData.requests.length}
            </span>
          )}
        </button>

        {/* Messages Icon */}
        <button
          onClick={() => openPanel("messages")}
          className="p-2 rounded-lg transition-colors relative"
          style={{
            color: theme.text.secondary,
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.hover;
            e.currentTarget.style.color = theme.text.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = theme.text.secondary;
          }}
          title="Messages"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {unreadMessages > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2"
              style={{
                backgroundColor: theme.error,
                borderColor: theme.bg.overlay,
              }}
            ></span>
          )}
        </button>

        {/* Notifications Icon */}
        <button
          onClick={() => openPanel("notifications")}
          className="p-2 rounded-lg transition-colors relative"
          style={{
            color: theme.text.secondary,
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.hover;
            e.currentTarget.style.color = theme.text.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = theme.text.secondary;
          }}
          title="Notifications"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadNotifications > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2"
              style={{
                backgroundColor: theme.primary,
                borderColor: theme.bg.overlay,
              }}
            ></span>
          )}
        </button>

        {activePanel && (
          <div
            className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] rounded-xl border shadow-2xl overflow-hidden"
            style={{
              backgroundColor: theme.bg.secondary,
              borderColor: theme.border.secondary,
              color: theme.text.primary,
            }}
          >
            {activePanel === "friends" && (
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="font-bold text-lg">Friends</h3>
                  <p className="text-xs" style={{ color: theme.text.tertiary }}>
                    Search players, send requests, and approve invites.
                  </p>
                </div>

                <input
                  value={friendQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFriendQuery(value);
                    if (value.trim().length < 2) {
                      setFriendResults([]);
                    }
                  }}
                  placeholder="Search username or email"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    backgroundColor: theme.bg.tertiary,
                    border: `1px solid ${theme.border.secondary}`,
                    color: theme.text.primary,
                  }}
                />

                {friendStatus && (
                  <div
                    className="rounded-lg px-3 py-2 text-xs"
                    style={{ backgroundColor: theme.bg.tertiary, color: theme.text.secondary }}
                  >
                    {friendStatus}
                  </div>
                )}

                {friendResults.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide" style={{ color: theme.text.tertiary }}>
                      Search Results
                    </div>
                    {friendResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between gap-3 rounded-lg p-2"
                        style={{ backgroundColor: theme.bg.tertiary }}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{result.username}</div>
                          <div className="text-xs" style={{ color: theme.text.tertiary }}>
                            {result.rating} rating
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={result.relationship !== "none"}
                          onClick={() => sendFriendRequest(result)}
                          className="rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                          style={{
                            backgroundColor: theme.primary,
                            color: isDark ? "#000" : "#fff",
                          }}
                        >
                          {result.relationship === "friend"
                            ? "Friends"
                            : result.relationship === "pending"
                              ? "Pending"
                              : result.relationship === "incoming"
                                ? "Requested"
                                : "Add"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide" style={{ color: theme.text.tertiary }}>
                    Requests
                  </div>
                  {friendsData.requests.length === 0 ? (
                    <div className="text-sm" style={{ color: theme.text.secondary }}>
                      No pending requests.
                    </div>
                  ) : (
                    friendsData.requests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between gap-2 rounded-lg p-2"
                        style={{ backgroundColor: theme.bg.tertiary }}
                      >
                        <span className="font-semibold">{request.from.username}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => respondToRequest(request.id, "accept")}
                            className="rounded px-2 py-1 text-xs bg-green-600 text-white"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => respondToRequest(request.id, "decline")}
                            className="rounded px-2 py-1 text-xs bg-gray-600 text-white"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide" style={{ color: theme.text.tertiary }}>
                    Friends
                  </div>
                  {friendsData.friends.length === 0 ? (
                    <div className="text-sm" style={{ color: theme.text.secondary }}>
                      Add friends to start building your chess circle.
                    </div>
                  ) : (
                    friendsData.friends.map((friend) => (
                      <div
                        key={friend.id}
                        className="rounded-lg p-2"
                        style={{ backgroundColor: theme.bg.tertiary }}
                      >
                        <div className="font-semibold">{friend.username}</div>
                        <div className="text-xs" style={{ color: theme.text.tertiary }}>
                          {friend.rating} rating · {friend.gamesPlayed} games
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activePanel === "messages" && (
              <div className="p-4 space-y-4">
                <h3 className="font-bold text-lg">Messages</h3>
                <div className="flex gap-2">
                  <input
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendLocalMessage();
                    }}
                    placeholder="Write a quick note"
                    className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: theme.bg.tertiary,
                      border: `1px solid ${theme.border.secondary}`,
                      color: theme.text.primary,
                    }}
                  />
                  <button
                    type="button"
                    onClick={sendLocalMessage}
                    className="rounded-lg px-3 py-2 text-sm font-semibold"
                    style={{ backgroundColor: theme.primary, color: isDark ? "#000" : "#fff" }}
                  >
                    Send
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-lg p-3"
                      style={{ backgroundColor: theme.bg.tertiary }}
                    >
                      <div className="text-sm font-semibold">{message.from}</div>
                      <div className="text-sm mt-1" style={{ color: theme.text.secondary }}>
                        {message.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activePanel === "notifications" && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Notifications</h3>
                  <button
                    type="button"
                    onClick={() => setNotifications([])}
                    className="text-xs"
                    style={{ color: theme.text.tertiary }}
                  >
                    Clear
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div className="text-sm" style={{ color: theme.text.secondary }}>
                    No notifications.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="rounded-lg p-3"
                        style={{ backgroundColor: theme.bg.tertiary }}
                      >
                        <div className="font-semibold">{notification.title}</div>
                        <div className="text-sm mt-1" style={{ color: theme.text.secondary }}>
                          {notification.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors"
          style={{
            color: theme.text.secondary,
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.hover;
            e.currentTarget.style.color = theme.text.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = theme.text.secondary;
          }}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>

        {/* Divider */}
        <div
          className="h-8 w-px mx-1 hidden sm:block"
          style={{ backgroundColor: theme.border.secondary }}
        ></div>

        {/* User Avatar Dropdown */}
        <div className="relative ml-1 sm:ml-2" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none p-1 rounded-lg"
          >
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center font-bold shadow-sm"
              style={{
                backgroundColor: theme.primary,
                color: isDark ? "#000" : "#fff",
              }}
            >
              {initial}
            </div>
            <svg
              className="hidden sm:block w-4 h-4 transition-transform duration-200"
              style={{ color: theme.text.secondary }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div
              className="absolute right-0 mt-3 w-56 rounded-lg shadow-xl py-2 z-50 transform opacity-100 scale-100 transition-all origin-top-right"
              style={{
                backgroundColor: theme.bg.secondary,
                borderColor: theme.border.secondary,
                border: `1px solid ${theme.border.secondary}`,
              }}
            >
              <div
                className="px-4 py-3 mb-2"
                style={{
                  borderBottomColor: theme.border.secondary,
                  borderBottom: `1px solid ${theme.border.secondary}`,
                }}
              >
                <p
                  className="text-sm font-bold truncate"
                  style={{ color: theme.text.primary }}
                >
                  {user?.username || "Guest Player"}
                </p>
                <p
                  className="text-xs truncate mt-0.5"
                  style={{ color: theme.text.tertiary }}
                >
                  {user?.email || "No email linked"}
                </p>
              </div>
              <button
                onClick={() => onNavigate?.("profile")}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3"
                style={{
                  color: theme.text.secondary,
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.hover;
                  e.currentTarget.style.color = theme.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = theme.text.secondary;
                }}
              >
                <span className="text-lg">👤</span> Profile
              </button>
              <button
                className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3"
                style={{
                  color: theme.text.secondary,
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.hover;
                  e.currentTarget.style.color = theme.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = theme.text.secondary;
                }}
              >
                <span className="text-lg">🏆</span> Achievements
              </button>
              <button
                onClick={() => onNavigate?.("settings")}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3"
                style={{
                  color: theme.text.secondary,
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.hover;
                  e.currentTarget.style.color = theme.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = theme.text.secondary;
                }}
              >
                <span className="text-lg">⚙️</span> Settings
              </button>
              <div
                className="my-2"
                style={{
                  borderTopColor: theme.border.secondary,
                  borderTop: `1px solid ${theme.border.secondary}`,
                }}
              ></div>
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3"
                style={{
                  color: theme.error,
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDark
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(220, 38, 38, 0.1)";
                  e.currentTarget.style.color = theme.error;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = theme.error;
                }}
              >
                <span className="text-lg">🚪</span> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
