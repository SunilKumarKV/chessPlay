import React from "react";
import { useTheme } from "../../../hooks/useTheme";

export default function SidebarItem({
  icon,
  label,
  isActive,
  isCollapsed,
  onClick,
}) {
  const { theme } = useTheme();

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg font-bold transition-all text-left relative group ${
        isCollapsed ? "justify-center !px-0" : ""
      }`}
      style={{
        backgroundColor: isActive ? theme.active : "transparent",
        color: isActive ? theme.text.primary : theme.text.secondary,
        boxShadow: isActive ? "0 1px 3px rgba(0, 0, 0, 0.1)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = theme.hover;
          e.currentTarget.style.color = theme.text.primary;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = theme.text.secondary;
        }
      }}
    >
      <span className="text-2xl drop-shadow-sm flex-shrink-0">{icon}</span>
      {!isCollapsed && (
        <span className="text-sm font-['Montserrat'] truncate">{label}</span>
      )}
      {isCollapsed && (
        <div
          className="absolute left-full ml-3 px-3 py-2 text-sm font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border"
          style={{
            backgroundColor: theme.bg.secondary,
            color: theme.text.primary,
            borderColor: theme.border.secondary,
          }}
        >
          {label}
        </div>
      )}
    </button>
  );
}
