import React, { useEffect } from "react";
import PlanBadge from "../../../components/billing/PlanBadge";
import { isGuestRestrictedFeature, isGuestUser } from "../../../utils/guestAccess";
import { Badge, Button, Card } from "../../../components/ui";

const ROUTE_GROUPS = [
  {
    title: "Play",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "▦", auth: true },
      { id: "ai", label: "Play vs AI", icon: "♞" },
      { id: "multi", label: "Play Online", icon: "♟", auth: true },
      { id: "local", label: "Play vs Player", icon: "♙" },
      { id: "lan", label: "Same WiFi", icon: "⇄" },
    ],
  },
  {
    title: "Improve",
    items: [
      { id: "puzzles", label: "Puzzles", icon: "◇" },
      { id: "analysis", label: "Analysis", icon: "∑" },
      { id: "leaderboard", label: "Leaderboard", icon: "★" },
      { id: "help", label: "How It Works", icon: "?" },
    ],
  },
  {
    title: "Community",
    items: [
      { id: "community", label: "Community", icon: "☷" },
      { id: "messages", label: "Messages", icon: "✉", auth: true },
      { id: "referral", label: "Referral", icon: "↗", auth: true },
      { id: "tournaments", label: "Tournaments", icon: "🏆" },
    ],
  },
  {
    title: "Account",
    items: [
      { id: "profile", label: "Profile", icon: "◉", auth: true },
      { id: "settings", label: "Settings", icon: "⚙", auth: true },
      { id: "billing", label: "Billing", icon: "◈", auth: true },
    ],
  },
  {
    title: "Support",
    items: [
      { id: "monetization", label: "Premium", icon: "♛" },
      { id: "support", label: "Support", icon: "♡" },
      { id: "pricing", label: "Pricing", icon: "₹" },
    ],
  },
];

function getSupporterState(user) {
  if (!user) return "guest";
  if (user.isSupporter || user.adsDisabled || user.plan === "supporter") return "supporter";
  if (user.supporterStatus === "pending" || user.billingStatus === "pending") return "pending";
  if (user.supporterStatus === "rejected" || user.billingStatus === "rejected") return "rejected";
  return "free";
}

function ratingLabel(user) {
  return Number.isFinite(Number(user?.rating)) ? `${Number(user.rating)} rating` : "Unrated";
}

function isVisible(item, user) {
  if (item.auth && !user) return false;
  return true;
}

function NavButton({ item, activePage, isCollapsed, onNavigate, user }) {
  const active = activePage === item.id;
  const lockedForGuest = isGuestUser(user) && isGuestRestrictedFeature(item.id);

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      title={isCollapsed ? item.label : undefined}
      className={`ds-focus group flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-xl)] border px-3 py-2.5 text-left text-sm font-bold transition duration-200 hover:-translate-y-0.5 ${
        active
          ? "border-[color-mix(in_srgb,var(--color-primary)_46%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)] shadow-[var(--shadow-xs)]"
          : "border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
      } ${isCollapsed ? "justify-center" : "justify-start"}`}
    >
      <span className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-[var(--radius-lg)] text-base ${active ? "bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)]" : "bg-[var(--color-surface)]"}`}>
        {item.icon}
      </span>
      {!isCollapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {lockedForGuest && (
            <Badge className="ml-auto" tone="warning" size="sm">Login</Badge>
          )}
        </>
      )}
    </button>
  );
}

export default function Sidebar({
  isOpen,
  onClose,
  activePage = "dashboard",
  onNavigate,
  user,
  isCollapsed,
  onToggleCollapse,
}) {
  const supporterState = getSupporterState(user);
  const initial = user?.username ? user.username.charAt(0).toUpperCase() : "C";

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleNavigate = (id) => {
    onNavigate?.(id);
    onClose?.();
  };

  const groups = [
    ...ROUTE_GROUPS,
    ...(user?.isAdmin
      ? [
          {
            title: "Admin",
            items: [
              { id: "admin", label: "Admin Panel", icon: "🛡" },
              { id: "admin-supporters", label: "Payments", icon: "◈" },
              { id: "automation", label: "Automation", icon: "⚡" },
            ],
          },
        ]
      : []),
  ];

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-[var(--z-overlay)] cursor-default bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        aria-label="ChessPlay sidebar navigation"
        className={`ds-glass fixed left-0 top-0 z-[var(--z-modal)] flex h-[100dvh] flex-col border-r transition-all duration-300 lg:static lg:z-[var(--z-nav)] lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-20" : "w-80 lg:w-72"}`}
      >
        <div className="flex h-20 items-center justify-between gap-3 border-b border-[var(--color-border-primary)] px-4">
          <button
            type="button"
            onClick={() => handleNavigate("dashboard")}
            aria-label="Go to ChessPlay home"
            className={`ds-focus flex min-w-0 items-center gap-3 rounded-[var(--radius-xl)] p-1 text-left ${isCollapsed ? "justify-center" : ""}`}
          >
            <span
              className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-[var(--radius-xl)] bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-2xl font-black text-[var(--color-primary)] shadow-[var(--shadow-xs)]"
              aria-hidden="true"
            >
              ♟
            </span>
            {!isCollapsed && (
              <span className="min-w-0">
                <span className="block truncate text-xl font-black tracking-tight">ChessPlay</span>
                <span className="block truncate text-xs font-semibold text-[var(--color-text-tertiary)]">
                  Play. Improve. Compete.
                </span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="ds-focus rounded-[var(--radius-lg)] px-3 py-2 text-lg font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] lg:hidden"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 custom-scrollbar">
          {groups.map((group) => {
            const visibleItems = group.items.filter((item) => isVisible(item, user));
            if (visibleItems.length === 0) return null;

            return (
              <section key={group.title} aria-labelledby={`sidebar-${group.title}`}>
                {!isCollapsed ? (
                  <h2
                    id={`sidebar-${group.title}`}
                    className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]"
                  >
                    {group.title}
                  </h2>
                ) : (
                  <div className="mx-auto mb-2 h-px w-10 bg-[var(--color-border-primary)]" />
                )}
                <div className="space-y-1.5">
                  {visibleItems.map((item) => (
                    <NavButton
                      key={item.id}
                      item={item}
                      activePage={activePage}
                      isCollapsed={isCollapsed}
                      onNavigate={handleNavigate}
                      user={user}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </nav>

        <div className="border-t border-[var(--color-border-primary)] p-3">
          <div className="mb-3 hidden lg:block">
            <Button
              type="button"
              onClick={onToggleCollapse}
              variant="ghost"
              className={`w-full ${isCollapsed ? "justify-center" : ""}`}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span>{isCollapsed ? "→" : "←"}</span>
              {!isCollapsed && <span>Collapse</span>}
            </Button>
          </div>

          {user ? (
            <Card
              as="button"
              type="button"
              onClick={() => handleNavigate("profile")}
              interactive
              variant="subtle"
              className={`flex w-full items-center gap-3 p-3 text-left ${isCollapsed ? "justify-center" : ""}`}
            >
              <span
                className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-sm font-black text-[var(--color-primary-contrast)]"
              >
                {initial}
              </span>
              {!isCollapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{user.username || "Player"}</span>
                  <span className="block truncate text-xs text-[var(--color-text-tertiary)]">
                    {user?.isGuest ? "Guest mode · limited" : ratingLabel(user)}
                  </span>
                  <PlanBadge user={user} compact />
                </span>
              )}
            </Card>
          ) : (
            <Card
              as="button"
              type="button"
              onClick={() => handleNavigate("dashboard")}
              interactive
              variant="dashed"
              className="w-full p-3 text-left text-sm font-bold text-[var(--color-text-secondary)]"
            >
              Sign in to unlock your dashboard.
            </Card>
          )}

          {!isCollapsed && supporterState !== "supporter" && (
            <Button
              type="button"
              onClick={() => handleNavigate(supporterState === "rejected" ? "billing" : "monetization")}
              className="mt-3 w-full"
              variant="outline"
            >
              {supporterState === "pending" ? "Pending verification" : supporterState === "rejected" ? "View billing status" : "Support ChessPlay"}
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
