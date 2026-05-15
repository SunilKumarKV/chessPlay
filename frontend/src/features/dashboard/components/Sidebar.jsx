import React, { useEffect } from "react";
import { useTheme } from "../../../hooks/useTheme";
import PlanBadge from "../../../components/billing/PlanBadge";

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

function isVisible(item, user) {
  if (item.auth && !user) return false;
  return true;
}

function NavButton({ item, activePage, isCollapsed, onNavigate }) {
  const { theme } = useTheme();
  const active = activePage === item.id;

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      title={isCollapsed ? item.label : undefined}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        isCollapsed ? "justify-center" : "justify-start"
      }`}
      style={{
        backgroundColor: active ? `${theme.primary}22` : "transparent",
        color: active ? theme.primary : theme.text.secondary,
        border: `1px solid ${active ? `${theme.primary}66` : "transparent"}`,
        boxShadow: active ? `0 8px 24px ${theme.primary}18` : "none",
      }}
      onMouseEnter={(event) => {
        if (!active) {
          event.currentTarget.style.backgroundColor = theme.hover;
          event.currentTarget.style.color = theme.text.primary;
        }
      }}
      onMouseLeave={(event) => {
        if (!active) {
          event.currentTarget.style.backgroundColor = "transparent";
          event.currentTarget.style.color = theme.text.secondary;
        }
      }}
    >
      <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-base" style={{ backgroundColor: active ? `${theme.primary}18` : "rgba(255,255,255,0.04)" }}>
        {item.icon}
      </span>
      {!isCollapsed && <span className="truncate">{item.label}</span>}
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
  const { theme, isDark } = useTheme();
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
          className="fixed inset-0 z-40 cursor-default bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        aria-label="ChessPlay sidebar navigation"
        className={`fixed left-0 top-0 z-50 flex h-[100dvh] flex-col border-r shadow-2xl transition-all duration-300 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-20" : "w-80 lg:w-72"}`}
        style={{
          backgroundColor: theme.bg.secondary,
          borderColor: theme.border.secondary,
          color: theme.text.primary,
        }}
      >
        <div className="flex h-20 items-center justify-between gap-3 border-b px-4" style={{ borderColor: theme.border.secondary }}>
          <button
            type="button"
            onClick={() => handleNavigate("dashboard")}
            aria-label="Go to ChessPlay home"
            className={`flex min-w-0 items-center gap-3 rounded-xl p-1 text-left focus:outline-none focus-visible:ring-2 ${isCollapsed ? "justify-center" : ""}`}
          >
            <span
              className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl text-2xl font-black shadow-lg"
              style={{ backgroundColor: `${theme.primary}22`, color: theme.primary }}
              aria-hidden="true"
            >
              ♟
            </span>
            {!isCollapsed && (
              <span className="min-w-0">
                <span className="block truncate text-xl font-black tracking-tight">ChessPlay</span>
                <span className="block truncate text-xs font-semibold" style={{ color: theme.text.tertiary }}>
                  Play. Improve. Compete.
                </span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-xl px-3 py-2 text-lg font-bold transition lg:hidden"
            style={{ color: theme.text.secondary }}
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
                    className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.22em]"
                    style={{ color: theme.text.tertiary }}
                  >
                    {group.title}
                  </h2>
                ) : (
                  <div className="mx-auto mb-2 h-px w-10" style={{ backgroundColor: theme.border.secondary }} />
                )}
                <div className="space-y-1.5">
                  {visibleItems.map((item) => (
                    <NavButton
                      key={item.id}
                      item={item}
                      activePage={activePage}
                      isCollapsed={isCollapsed}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </nav>

        <div className="border-t p-3" style={{ borderColor: theme.border.secondary }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`mb-3 hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition lg:flex ${isCollapsed ? "justify-center" : ""}`}
            style={{ color: theme.text.secondary, backgroundColor: "transparent" }}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span>{isCollapsed ? "→" : "←"}</span>
            {!isCollapsed && <span>Collapse</span>}
          </button>

          {user ? (
            <button
              type="button"
              onClick={() => handleNavigate("profile")}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${isCollapsed ? "justify-center" : ""}`}
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.035)",
                borderColor: theme.border.secondary,
              }}
            >
              <span
                className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl text-sm font-black"
                style={{ backgroundColor: theme.primary, color: isDark ? "#07120a" : "#ffffff" }}
              >
                {initial}
              </span>
              {!isCollapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{user.username || "Player"}</span>
                  <span className="block truncate text-xs" style={{ color: theme.text.tertiary }}>
                    {user.rating || 1200} rating
                  </span>
                  <PlanBadge user={user} compact />
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNavigate("dashboard")}
              className="w-full rounded-2xl border p-3 text-left text-sm font-bold"
              style={{ borderColor: theme.border.secondary, color: theme.text.secondary }}
            >
              Sign in to unlock your dashboard.
            </button>
          )}

          {!isCollapsed && supporterState !== "supporter" && (
            <button
              type="button"
              onClick={() => handleNavigate(supporterState === "rejected" ? "billing" : "monetization")}
              className="mt-3 w-full rounded-2xl px-4 py-3 text-sm font-black transition"
              style={{ backgroundColor: `${theme.primary}22`, color: theme.primary, border: `1px solid ${theme.primary}55` }}
            >
              {supporterState === "pending" ? "Pending verification" : supporterState === "rejected" ? "View billing status" : "Support ChessPlay"}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
