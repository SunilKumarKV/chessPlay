import React from "react";
import { useTheme } from "../../hooks/useTheme";

// Game Card - Clickable row with opponent info, result pill, time, moves
export const GameCard = ({
  opponent,
  result,
  timeControl,
  moves,
  date,
  onClick,
  className = "",
  ...props
}) => {
  const { theme } = useTheme();
  const getResultColor = (result) => {
    switch (result) {
      case "win":
        return "bg-green-600";
      case "loss":
        return "bg-red-600";
      case "draw":
        return "bg-yellow-600";
      default:
        return "bg-[#2a2a2a]";
    }
  };

  const getResultText = (result) => {
    switch (result) {
      case "win":
        return "Won";
      case "loss":
        return "Lost";
      case "draw":
        return "Draw";
      default:
        return "Unknown";
    }
  };

  return (
    <div
      onClick={onClick}
      className={`border rounded-lg p-4 transition-colors cursor-pointer ${className}`}
      style={{
        backgroundColor: theme.bg.secondary,
        borderColor: theme.border.primary,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = theme.hover)
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = theme.bg.secondary)
      }
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#81b64c] rounded-full flex items-center justify-center text-[#0e0e0e] font-bold font-['Montserrat']">
            {opponent?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p
              className="font-medium font-['Inter']"
              style={{ color: theme.text.primary }}
            >
              {opponent}
            </p>
            <p
              className="text-sm font-['Inter']"
              style={{ color: theme.text.tertiary }}
            >
              {timeControl} • {moves} moves
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className="text-sm font-['Inter']"
            style={{ color: theme.text.tertiary }}
          >
            {date}
          </span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${getResultColor(result)}`}
          >
            {getResultText(result)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Stat Card - Icon, value, label, optional delta indicator
export const StatCard = ({
  icon,
  value,
  label,
  delta,
  deltaType = "neutral", // 'positive', 'negative', 'neutral'
  className = "",
  ...props
}) => {
  const { theme } = useTheme();
  const getDeltaColor = (type) => {
    switch (type) {
      case "positive":
        return theme.success;
      case "negative":
        return theme.error;
      default:
        return theme.text.tertiary;
    }
  };

  const getDeltaIcon = (type) => {
    switch (type) {
      case "positive":
        return "↗️";
      case "negative":
        return "↘️";
      default:
        return "";
    }
  };

  return (
    <div
      className={`border rounded-lg p-6 ${className}`}
      style={{
        backgroundColor: theme.bg.secondary,
        borderColor: theme.border.primary,
      }}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className="text-2xl font-bold font-['Montserrat']"
            style={{ color: theme.text.primary }}
          >
            {value}
          </p>
          <p
            className="text-sm font-['Inter']"
            style={{ color: theme.text.tertiary }}
          >
            {label}
          </p>
          {delta && (
            <p
              className={`text-sm font-medium font-['Inter']`}
              style={{ color: getDeltaColor(deltaType) }}
            >
              {getDeltaIcon(deltaType)} {delta}
            </p>
          )}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
};

// Player Card - Avatar, name, rating, online dot
export const PlayerCard = ({
  avatar,
  name,
  rating,
  isOnline = false,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 flex items-center space-x-3 ${className}`}
      {...props}
    >
      <div className="relative">
        <div className="w-12 h-12 bg-[#81b64c] rounded-full flex items-center justify-center text-[#0e0e0e] font-bold font-['Montserrat']">
          {avatar || name?.charAt(0).toUpperCase()}
        </div>
        {isOnline && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#1a1a1a] rounded-full"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[#e0e0e0] truncate font-['Inter']">
          {name}
        </p>
        <p className="text-sm text-[#7a7a7a] font-['Inter']">
          Rating: {rating}
        </p>
      </div>
    </div>
  );
};
