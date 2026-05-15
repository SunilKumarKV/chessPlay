import React, { useEffect } from "react";
import SidebarItem from "./SidebarItem";
import { useTheme } from "../../../hooks/useTheme";
import PlanBadge from "../../../components/billing/PlanBadge";

const NAV_GROUPS = [
  {
    title: "Play",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "♜", auth: true },
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
      { id: "pricing", label: "Premium", icon: "👑" },
      { id: "monetization", label: "Support ChessPlay", icon: "₹" },
      { id: "help", label: "How It Works", icon: "?" },
    ],
  },
  {
    title: "Admin",
    adminOnly: true,
    items: [
      { id: "admin-supporters", label: "Payments", icon: "🛡" },
      { id: "automation", label: "Automation", icon: "🤖" },
    ],
  },
];

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
  const isAdmin = Boolean(user?.isAdmin || user?.role === "admin");
  const isLoggedIn = Boolean(user && !user.isGuest);
  const initial = user?.username ? user.username.charAt(0).toUpperCase() : "U";

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isOpen) onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleNav = (id) => {
    onNavigate?.(id);
    onClose?.();
  };

  const visibleGroups = NAV_GROUPS.map((group) => {
    if (group.adminOnly && !isAdmin) return null;
    const items = group.items.filter((item) => !item.auth || isLoggedIn);
    if (items.length === 0) return null;
    return { ...group, items };
  }).filter(Boolean);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default backdrop-blur-sm md:hidden"
          aria-label="Close navigation menu"
          onClick={onClose}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col shadow-2xl transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${isCollapsed ? "w-20" : "w-72"}`}
        style={{
          background: `linear-gradient(180deg, ${theme.bg.secondary}, ${theme.bg.primary})`,
          borderRight: `1px solid ${theme.border.secondary}`,
          color: theme.text.primary,
        }}
        aria-label="Main navigation"
      >
        <div
          className={`flex h-20 flex-shrink-0 items-center p-5 ${isCollapsed ? "justify-center" : "justify-between"}`}
          style={{ borderBottom: `1px solid ${theme.border.secondary}` }}
        >
          <button
            type="button"
            onClick={() => handleNav("dashboard")}
            className="flex min-w-0 items-center gap-3 text-left font-['Montserrat'] text-2xl font-black"
            style={{ color: theme.text.primary }}
            aria-label="Go to ChessPlay home"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-2xl shadow-lg" style={{ backgroundColor: theme.active, color: theme.primary }}>
              ♟
            </span>
            {!isCollapsed && <span className="truncate">ChessPlay</span>}
          </button>
          {!isCollapsed && (
            <button
              type="button"
              className="rounded-lg p-2 md:hidden"
              style={{ color: theme.text.secondary }}
              onClick={onClose}
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          )}
        </div>

        <nav className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {visibleGroups.map((group) => (
            <section key={group.title}>
              {!isCollapsed ? (
                <h3 className="px-4 pb-2 pt-2 text-xs font-black uppercase tracking-[0.22em]" style={{ color: theme.text.tertiary }}>
                  {group.title}
                </h3>
              ) : (
                <div className="my-3 h-px w-full" style={{ backgroundColor: theme.border.secondary }} />
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    isActive={activePage === item.id}
                    isCollapsed={isCollapsed}
                    onClick={() => handleNav(item.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div
          className="flex-shrink-0 space-y-3 p-3"
          style={{
            borderTop: `1px solid ${theme.border.secondary}`,
            background: isDark
              ? "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))"
              : "linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.02))",
          }}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`hidden w-full items-center gap-4 rounded-xl px-4 py-3 text-left font-bold transition-colors md:flex ${isCollapsed ? "justify-center !px-0" : ""}`}
            style={{ color: theme.text.secondary }}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span>{isCollapsed ? "→" : "←"}</span>
            {!isCollapsed && <span className="text-sm">Collapse</span>}
          </button>

          <button
            type="button"
            onClick={() => handleNav(isLoggedIn ? "profile" : "pricing")}
            className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${isCollapsed ? "justify-center" : ""}`}
            style={{ backgroundColor: theme.bg.tertiary }}
            aria-label={isLoggedIn ? "Open profile" : "Open premium page"}
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-black" style={{ backgroundColor: theme.primary, color: isDark ? "#000" : "#fff" }}>
              {initial}
            </span>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black" style={{ color: theme.text.primary }}>
                  {user?.username || "ChessPlay Guest"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <PlanBadge user={user} compact />
                  {user?.supporterStatus === "pending" && (
                    <span className="rounded-full border border-amber-300/30 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
