import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../../../hooks/useTheme";
import PlanBadge from "../../../components/billing/PlanBadge";

const QUICK_LINKS = [
  { id: "ai", label: "AI" },
  { id: "multi", label: "Online" },
  { id: "puzzles", label: "Puzzles" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "pricing", label: "Premium" },
];

export default function Topbar({ onMenuClick, user, onNavigate, onLogout }) {
  const { isDark, toggleTheme, theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const menuRef = useRef(null);
  const quickRef = useRef(null);
  const isAdmin = Boolean(user?.isAdmin || user?.role === "admin");
  const isLoggedIn = Boolean(user && !user.isGuest);
  const initial = user?.username ? user.username.charAt(0).toUpperCase() : "U";

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (quickRef.current && !quickRef.current.contains(event.target)) {
        setQuickOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setQuickOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const goTo = (id) => {
    onNavigate?.(id);
    setMenuOpen(false);
    setQuickOpen(false);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    onLogout?.();
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-20 flex-shrink-0 items-center justify-between gap-3 px-4 shadow-md transition-colors duration-300"
      style={{
        backgroundColor: theme.bg.overlay,
        borderBottom: `1px solid ${theme.border.secondary}`,
        color: theme.text.primary,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex items-center justify-center rounded-xl p-2 transition-colors md:hidden"
          style={{ color: theme.text.secondary }}
          aria-label="Open navigation menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => goTo("dashboard")}
          className="flex min-w-0 items-center gap-2 font-['Montserrat'] text-xl font-black md:hidden"
          aria-label="Go to ChessPlay dashboard"
          style={{ color: theme.text.primary }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: theme.active, color: theme.primary }}>
            ♟
          </span>
          <span className="hidden truncate sm:inline">ChessPlay</span>
        </button>

        <div className="hidden min-w-0 md:block">
          <div className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: theme.text.tertiary }}>
            ChessPlay
          </div>
          <div className="truncate text-lg font-black" style={{ color: theme.text.primary }}>
            Play, improve, and connect
          </div>
        </div>

        <div className="relative hidden lg:block" ref={quickRef}>
          <button
            type="button"
            onClick={() => setQuickOpen((open) => !open)}
            className="rounded-full border px-4 py-2 text-sm font-bold transition-colors"
            style={{ borderColor: theme.border.secondary, color: theme.text.secondary }}
            aria-expanded={quickOpen}
            aria-haspopup="menu"
          >
            Quick links ▾
          </button>
          {quickOpen && (
            <div
              className="absolute left-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border shadow-2xl"
              style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.secondary }}
              role="menu"
            >
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => goTo(link.id)}
                  className="block w-full px-4 py-3 text-left text-sm font-bold transition-colors"
                  style={{ color: theme.text.primary }}
                  role="menuitem"
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {isLoggedIn && user?.supporterStatus === "pending" && (
          <button
            type="button"
            onClick={() => goTo("billing")}
            className="hidden rounded-full border border-amber-300/40 px-3 py-1.5 text-xs font-black text-amber-200 sm:inline-flex"
          >
            Pending verification
          </button>
        )}

        {isLoggedIn && <PlanBadge user={user} compact />}

        {!user?.isSupporter && !user?.isPremium && (
          <button
            type="button"
            onClick={() => goTo("pricing")}
            className="hidden rounded-full px-4 py-2 text-sm font-black shadow-lg sm:inline-flex"
            style={{ backgroundColor: theme.primary, color: isDark ? "#000" : "#fff" }}
          >
            Support ChessPlay
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl p-2 transition-colors"
          style={{ color: theme.text.secondary, backgroundColor: theme.bg.tertiary }}
          aria-label="Toggle theme"
        >
          {isDark ? "☀" : "🌙"}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-2xl p-1.5 pr-2 transition-colors"
            style={{ backgroundColor: theme.bg.tertiary, color: theme.text.primary }}
            aria-label="Open user menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full font-black" style={{ backgroundColor: theme.primary, color: isDark ? "#000" : "#fff" }}>
              {initial}
            </span>
            <span className="hidden max-w-[9rem] truncate text-sm font-black sm:inline">
              {user?.username || "Guest"}
            </span>
            <span aria-hidden="true">▾</span>
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border shadow-2xl"
              style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.secondary }}
              role="menu"
            >
              <div className="border-b p-4" style={{ borderColor: theme.border.secondary }}>
                <div className="font-black" style={{ color: theme.text.primary }}>
                  {user?.username || "Guest Player"}
                </div>
                <div className="mt-1 text-xs" style={{ color: theme.text.tertiary }}>
                  {isLoggedIn ? "Signed in to ChessPlay" : "Guest session"}
                </div>
                <div className="mt-3"><PlanBadge user={user} compact /></div>
              </div>

              {isLoggedIn ? (
                <div className="py-2">
                  {[
                    ["dashboard", "Dashboard"],
                    ["profile", "Profile"],
                    ["settings", "Settings"],
                    ["messages", "Messages"],
                    ["billing", "Billing"],
                    ["pricing", "Premium"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => goTo(id)}
                      className="block w-full px-4 py-2.5 text-left text-sm font-bold transition-colors"
                      style={{ color: theme.text.primary }}
                      role="menuitem"
                    >
                      {label}
                    </button>
                  ))}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => goTo("admin-supporters")}
                      className="block w-full px-4 py-2.5 text-left text-sm font-bold transition-colors"
                      style={{ color: theme.primary }}
                      role="menuitem"
                    >
                      Admin Panel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full border-t px-4 py-3 text-left text-sm font-black transition-colors"
                    style={{ color: theme.error, borderColor: theme.border.secondary }}
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => goTo("pricing")}
                    className="w-full rounded-xl px-4 py-3 text-sm font-black"
                    style={{ backgroundColor: theme.primary, color: isDark ? "#000" : "#fff" }}
                  >
                    Support ChessPlay
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
