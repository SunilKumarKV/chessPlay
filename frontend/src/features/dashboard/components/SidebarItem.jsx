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
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-200 text-left relative group hover:-translate-y-0.5 ${
        isCollapsed ? "justify-center !px-0" : ""
      }`}
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${theme.active}, rgba(255,255,255,0.08))`
          : "transparent",
        color: isActive ? theme.text.primary : theme.text.secondary,
        boxShadow: isActive ? `0 12px 30px ${theme.primary}20` : "none",
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
      {isActive && (
        <span
          className="absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: theme.primary }}
        />
      )}
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
