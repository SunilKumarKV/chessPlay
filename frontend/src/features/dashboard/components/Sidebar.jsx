import React from "react";
import SidebarItem from "./SidebarItem";
import { useTheme } from "../../../hooks/useTheme";

export default function Sidebar({
  isOpen,
  onClose,
  activePage = "play",
  onNavigate,
  user,
  isCollapsed,
  onToggleCollapse,
}) {
  const { theme, isDark } = useTheme();

  const navigationStructure = [
    {
      category: "Play",
      items: [
        { id: "dashboard", label: "Play Online", icon: "⚡" },
        { id: "ai", label: "Play vs AI", icon: "🤖" },
        { id: "challenge", label: "Challenge a Friend", icon: "🤝" },
        { id: "history", label: "Game History", icon: "📜" },
      ],
    },
    {
      category: "Multiplayer",
      items: [
        { id: "multi", label: "Multiplayer", icon: "👥" },
        { id: "tournament", label: "Tournament", icon: "🏆" },
      ],
    },
    {
      category: null,
      items: [
        { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
        { id: "puzzles", label: "Puzzles", icon: "🧩" },
        { id: "learn", label: "Learn", icon: "📚" },
        { id: "community", label: "Community", icon: "🌍" },
      ],
    },
    {
      category: "Settings",
      items: [
        { id: "settings", label: "Settings", icon: "⚙️" },
        { id: "profile", label: "Profile", icon: "👤" },
      ],
    },
  ];

  const handleNav = (id) => {
    if (onNavigate) onNavigate(id);
    onClose(); // Close mobile menu if open
  };

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : "U";

  return (
    <>
      {/* Mobile Overlay Background */}
      {isOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 flex-shrink-0 z-50 shadow-2xl transition-all duration-300 ease-in-out transform ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${isCollapsed ? "w-20" : "w-64"} flex flex-col`}
        style={{
          backgroundColor: theme.bg.overlay,
          borderRightColor: theme.border.secondary,
          borderRight: `1px solid ${theme.border.secondary}`,
          color: theme.text.primary,
        }}
      >
        {/* Brand Header */}
        <div
          className={`p-5 flex items-center ${isCollapsed ? "justify-center" : "justify-between"} flex-shrink-0 h-20 transition-colors duration-300`}
          style={{
            borderBottomColor: theme.border.secondary,
            borderBottom: `1px solid ${theme.border.secondary}`,
          }}
        >
          <div
            className="text-3xl font-black flex items-center gap-3 drop-shadow-md font-['Montserrat'] overflow-hidden"
            style={{ color: theme.text.primary }}
          >
            <span style={{ color: theme.primary }} className="flex-shrink-0">
              ♟
            </span>
            {!isCollapsed && <span>ChessPlay</span>}
          </div>
          {!isCollapsed && (
            <button
              className="md:hidden p-2 transition-colors"
              style={{
                color: theme.text.secondary,
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.text.primary;
                e.currentTarget.style.backgroundColor = theme.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.text.secondary;
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>

        {/* Main Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto custom-scrollbar">
          {navigationStructure.map((section, index) => (
            <div key={index}>
              {section.category && !isCollapsed && (
                <h3
                  className="px-4 pt-2 pb-1 text-xs font-bold uppercase tracking-wider"
                  style={{ color: theme.text.tertiary }}
                >
                  {section.category}
                </h3>
              )}
              {section.category && isCollapsed && index > 0 && (
                <div
                  className="w-full h-px my-2"
                  style={{ backgroundColor: theme.border.secondary }}
                />
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
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
            </div>
          ))}
        </nav>

        {/* Bottom User/Settings Area */}
        <div
          className="p-3 space-y-2 flex-shrink-0 transition-colors duration-300"
          style={{
            borderTopColor: theme.border.secondary,
            borderTop: `1px solid ${theme.border.secondary}`,
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.02)"
              : "rgba(0, 0, 0, 0.02)",
          }}
        >
          <button
            onClick={onToggleCollapse}
            className={`w-full hidden md:flex items-center gap-4 px-4 py-3 rounded-lg font-bold transition-colors text-left ${
              isCollapsed ? "justify-center !px-0" : ""
            }`}
            style={{
              color: theme.text.secondary,
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.text.primary;
              e.currentTarget.style.backgroundColor = theme.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.text.secondary;
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <span className="text-2xl drop-shadow-sm flex-shrink-0">
              {isCollapsed ? "→" : "←"}
            </span>
            {!isCollapsed && (
              <span className="text-lg font-['Montserrat'] truncate">
                Collapse
              </span>
            )}
          </button>

          <div
            onClick={() => handleNav("profile")}
            className={`mt-1 flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all shadow-inner ${
              isCollapsed ? "justify-center" : ""
            }`}
            style={{
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.03)",
              borderColor: theme.border.secondary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.03)";
            }}
          >
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center font-bold shadow-sm text-lg flex-shrink-0"
              style={{
                backgroundColor: theme.primary,
                color: isDark ? "#000" : "#fff",
              }}
            >
              {initial}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span
                  className="font-bold truncate text-sm"
                  style={{ color: theme.text.primary }}
                >
                  {user?.username || "Guest Player"}
                </span>
                <span
                  className="font-bold text-xs truncate"
                  style={{ color: theme.primary }}
                >
                  {user?.rating || 1200} ELO
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
