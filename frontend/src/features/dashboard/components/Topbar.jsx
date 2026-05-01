import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../../hooks/useTheme";

export default function Topbar({ onMenuClick, user, onNavigate, onLogout }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { isDark, toggleTheme, theme } = useTheme();

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : "U";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            placeholder="Search players, games, or puzzles..."
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
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        {/* Friends Icon */}
        <button
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
        </button>

        {/* Messages Icon */}
        <button
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
          <span
            className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2"
            style={{
              backgroundColor: theme.error,
              borderColor: theme.bg.overlay,
            }}
          ></span>
        </button>

        {/* Notifications Icon */}
        <button
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
          <span
            className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.bg.overlay,
            }}
          ></span>
        </button>

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
