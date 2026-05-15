import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../../hooks/useTheme";
import PlanBadge from "../../../components/billing/PlanBadge";

const QUICK_LINKS = [
  { id: "ai", label: "Play vs AI" },
  { id: "multi", label: "Play Online", auth: true },
  { id: "local", label: "Play vs Player" },
  { id: "puzzles", label: "Puzzles" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "community", label: "Community" },
];

const ACCOUNT_LINKS = [
  { id: "profile", label: "Profile", auth: true },
  { id: "settings", label: "Settings", auth: true },
  { id: "billing", label: "Billing", auth: true },
  { id: "monetization", label: "Premium" },
  { id: "help", label: "How It Works" },
];

function getPageTitle(activePage) {
  const titles = {
    dashboard: "Dashboard",
    ai: "Play vs AI",
    multi: "Play Online",
    local: "Play vs Player",
    lan: "Same WiFi",
    puzzles: "Puzzles",
    analysis: "Analysis",
    leaderboard: "Leaderboard",
    profile: "Profile",
    settings: "Settings",
    billing: "Billing",
    monetization: "Premium",
    support: "Support",
    pricing: "Pricing",
    referral: "Referral",
    tournaments: "Tournaments",
    community: "Community",
    messages: "Messages",
    admin: "Admin Panel",
    "admin-supporters": "Admin Payments",
    automation: "Admin Automation",
    help: "How It Works",
  };
  return titles[activePage] || "ChessPlay";
}

function isSupporter(user) {
  return Boolean(user?.isSupporter || user?.adsDisabled || user?.plan === "supporter");
}

export default function Topbar({ onMenuClick, user, onNavigate, onLogout, activePage }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const accountRef = useRef(null);
  const linksRef = useRef(null);
  const { isDark, toggleTheme, theme } = useTheme();
  const pageTitle = getPageTitle(activePage);
  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : "U";

  const visibleQuickLinks = useMemo(
    () => QUICK_LINKS.filter((link) => !link.auth || user),
    [user],
  );
  const visibleAccountLinks = useMemo(
    () => [
      ...ACCOUNT_LINKS.filter((link) => !link.auth || user),
      ...(user?.isAdmin ? [{ id: "admin", label: "Admin Panel" }] : []),
    ],
    [user],
  );

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
      if (linksRef.current && !linksRef.current.contains(event.target)) {
        setLinksOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        setLinksOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setAccountOpen(false);
    setLinksOpen(false);
  }, [activePage]);

  const navigate = (id) => {
    onNavigate?.(id);
    setAccountOpen(false);
    setLinksOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-20 flex-shrink-0 items-center justify-between gap-3 border-b px-3 shadow-md transition-colors sm:px-5"
      style={{
        backgroundColor: theme.bg.overlay,
        borderColor: theme.border.secondary,
        color: theme.text.primary,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl transition focus:outline-none focus-visible:ring-2 md:hidden"
          style={{ backgroundColor: theme.hover, color: theme.text.primary }}
        >
          ☰
        </button>

        <button
          type="button"
          onClick={() => navigate("dashboard")}
          aria-label="Go to ChessPlay dashboard"
          className="flex min-w-0 items-center gap-3 rounded-2xl p-1 text-left md:hidden"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl text-xl font-black" style={{ backgroundColor: `${theme.primary}22`, color: theme.primary }}>
            ♟
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-lg font-black">ChessPlay</span>
            <span className="block truncate text-xs" style={{ color: theme.text.tertiary }}>
              {pageTitle}
            </span>
          </span>
        </button>

        <div className="hidden min-w-0 md:block">
          <h1 className="truncate text-xl font-black tracking-tight">{pageTitle}</h1>
          <p className="truncate text-xs font-semibold" style={{ color: theme.text.tertiary }}>
            {user ? `Welcome back, ${user.username || "player"}` : "Play chess online, learn, and improve."}
          </p>
        </div>

        <div className="ml-2 hidden items-center gap-1 xl:flex" aria-label="Primary navigation">
          {visibleQuickLinks.slice(0, 5).map((link) => {
            const active = activePage === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => navigate(link.id)}
                className="rounded-xl px-3 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2"
                style={{
                  backgroundColor: active ? `${theme.primary}22` : "transparent",
                  color: active ? theme.primary : theme.text.secondary,
                }}
              >
                {link.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative xl:hidden" ref={linksRef}>
          <button
            type="button"
            onClick={() => setLinksOpen((open) => !open)}
            aria-expanded={linksOpen}
            aria-label="Open quick links"
            className="rounded-2xl px-3 py-2 text-sm font-black transition"
            style={{ backgroundColor: theme.hover, color: theme.text.primary }}
          >
            Menu
          </button>
          {linksOpen && (
            <div
              className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border p-2 shadow-2xl"
              style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.secondary }}
            >
              {visibleQuickLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => navigate(link.id)}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold"
                  style={{ color: activePage === link.id ? theme.primary : theme.text.secondary }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="grid h-10 w-10 place-items-center rounded-2xl text-lg transition"
          style={{ backgroundColor: theme.hover, color: theme.text.primary }}
        >
          {isDark ? "☀" : "☾"}
        </button>

        {user && !isSupporter(user) && (
          <button
            type="button"
            onClick={() => navigate("monetization")}
            className="hidden rounded-2xl px-4 py-2 text-sm font-black transition sm:inline-flex"
            style={{ backgroundColor: `${theme.primary}22`, color: theme.primary, border: `1px solid ${theme.primary}44` }}
          >
            Support
          </button>
        )}

        {!user && (
          <button
            type="button"
            onClick={() => navigate("dashboard")}
            className="rounded-2xl px-4 py-2 text-sm font-black transition"
            style={{ backgroundColor: theme.primary, color: isDark ? "#07120a" : "#ffffff" }}
          >
            Sign in
          </button>
        )}

        {user && (
          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-expanded={accountOpen}
              aria-label="Open account menu"
              className="flex items-center gap-2 rounded-2xl border px-2 py-2 transition"
              style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.secondary }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl text-sm font-black" style={{ backgroundColor: theme.primary, color: isDark ? "#07120a" : "#ffffff" }}>
                {userInitial}
              </span>
              <span className="hidden max-w-36 truncate text-left md:block">
                <span className="block truncate text-sm font-black">{user.username || "Player"}</span>
                <span className="block truncate text-[11px]" style={{ color: theme.text.tertiary }}>
                  {isSupporter(user) ? "Supporter" : `${user.rating || 1200} rating`}
                </span>
              </span>
            </button>

            {accountOpen && (
              <div
                className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border p-3 shadow-2xl"
                style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.secondary }}
              >
                <div className="mb-3 rounded-2xl p-3" style={{ backgroundColor: theme.bg.tertiary }}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl text-sm font-black" style={{ backgroundColor: theme.primary, color: isDark ? "#07120a" : "#ffffff" }}>
                      {userInitial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black">{user.username || "Player"}</div>
                      <div className="truncate text-xs" style={{ color: theme.text.tertiary }}>
                        {user.email || `${user.rating || 1200} rating`}
                      </div>
                      <PlanBadge user={user} compact />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  {visibleAccountLinks.map((link) => (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => navigate(link.id)}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition"
                      style={{ color: activePage === link.id ? theme.primary : theme.text.secondary }}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-3 block w-full rounded-xl px-3 py-2 text-left text-sm font-black transition"
                  style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444" }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
