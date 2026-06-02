import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../../hooks/useTheme";
import PlanBadge from "../../../components/billing/PlanBadge";
import { Button, Card } from "../../../components/ui";

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
  const { isDark, toggleTheme } = useTheme();
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
      className="sticky top-0 z-[var(--z-nav)] flex h-20 flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-glass)] px-3 text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] backdrop-blur-xl transition-colors sm:px-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          variant="secondary"
          size="icon"
          className="flex-shrink-0 md:hidden"
        >
          ☰
        </Button>

        <button
          type="button"
          onClick={() => navigate("dashboard")}
          aria-label="Go to ChessPlay dashboard"
          className="ds-focus flex min-w-0 items-center gap-3 rounded-[var(--radius-xl)] p-1 text-left md:hidden"
        >
          <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-xl)] bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-xl font-black text-[var(--color-primary)]">
            ♟
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-lg font-black">ChessPlay</span>
            <span className="block truncate text-xs text-[var(--color-text-tertiary)]">
              {pageTitle}
            </span>
          </span>
        </button>

        <div className="hidden min-w-0 md:block">
          <h1 className="truncate text-xl font-black tracking-tight">{pageTitle}</h1>
          <p className="truncate text-xs font-semibold text-[var(--color-text-tertiary)]">
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
                className={`ds-focus rounded-[var(--radius-lg)] px-3 py-2 text-sm font-bold transition hover:bg-[var(--color-surface)] ${
                  active ? "bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative xl:hidden" ref={linksRef}>
          <Button
            type="button"
            onClick={() => setLinksOpen((open) => !open)}
            aria-expanded={linksOpen}
            aria-label="Open quick links"
            variant="secondary"
            size="sm"
          >
            Menu
          </Button>
          {linksOpen && (
            <Card variant="glass" className="absolute right-0 mt-3 w-64 overflow-hidden p-2">
              {visibleQuickLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => navigate(link.id)}
                  className={`ds-focus block min-h-11 w-full rounded-[var(--radius-lg)] px-3 py-2 text-left text-sm font-bold transition hover:bg-[var(--color-surface)] ${
                    activePage === link.id ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </Card>
          )}
        </div>

        <Button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          variant="secondary"
          size="icon"
        >
          {isDark ? "☀" : "☾"}
        </Button>

        {user && !isSupporter(user) && (
          <Button
            type="button"
            onClick={() => navigate("monetization")}
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Support
          </Button>
        )}

        {!user && (
          <Button
            type="button"
            onClick={() => navigate("dashboard")}
          >
            Sign in
          </Button>
        )}

        {user && (
          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-expanded={accountOpen}
              aria-label="Open account menu"
              className="ds-focus flex min-h-11 items-center gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] px-2 py-2 transition hover:bg-[var(--color-surface-strong)]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-sm font-black text-[var(--color-primary-contrast)]">
                {userInitial}
              </span>
              <span className="hidden max-w-36 truncate text-left md:block">
                <span className="block truncate text-sm font-black">{user.username || "Player"}</span>
                <span className="block truncate text-[11px] text-[var(--color-text-tertiary)]">
                  {isSupporter(user) ? "Supporter" : `${user.rating || 1200} rating`}
                </span>
              </span>
            </button>

            {accountOpen && (
              <Card variant="glass" className="absolute right-0 mt-3 w-72 overflow-hidden p-3">
                <div className="mb-3 rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-sm font-black text-[var(--color-primary-contrast)]">
                      {userInitial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black">{user.username || "Player"}</div>
                      <div className="truncate text-xs text-[var(--color-text-tertiary)]">
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
                      className={`ds-focus block min-h-11 w-full rounded-[var(--radius-lg)] px-3 py-2 text-left text-sm font-bold transition hover:bg-[var(--color-surface)] ${
                        activePage === link.id ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>

                <Button
                  type="button"
                  onClick={onLogout}
                  className="mt-3 w-full justify-start"
                  variant="danger"
                >
                  Logout
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
