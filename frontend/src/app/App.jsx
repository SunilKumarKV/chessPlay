import { useEffect, useState } from "react";
import { notifyUserChanged } from "../hooks/useCurrentUser";
import { apiClient } from "../services/apiClient";
import Chess from "../features/chess/pages/ChessPage";
import MultiplayerChess from "../features/chess/components/MultiplayerChess";
import Leaderboard from "../pages/LeaderboardPage";
import GameHistory from "../pages/GameHistoryPage";
import LandingPage from "../pages/LandingPage";
import Dashboard from "../pages/DashboardPage";
import Settings from "../pages/SettingsPage";
import Profile from "../pages/ProfilePage";
import DashboardLayout from "../layouts/DashboardLayout";
import ErrorBoundary from "../components/ErrorBoundary";

export default function App() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return null;
      }
    }
    return null;
  });
  const [authChecked, setAuthChecked] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        localStorage.removeItem("token");
        const data = await apiClient("/api/auth/session");
        if (cancelled) return;
        const nextUser = data.user || null;
        if (nextUser) {
          localStorage.setItem("user", JSON.stringify(nextUser));
        } else {
          localStorage.removeItem("user");
        }
        setUser(nextUser);
        notifyUserChanged();
      } catch {
        if (!cancelled) {
          localStorage.removeItem("user");
          setUser(null);
          notifyUserChanged();
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    notifyUserChanged();
  };

  const handleLogout = async () => {
    try {
      await apiClient("/api/auth/logout", { method: "POST" });
    } catch {
      // Local logout should still complete if the session is already gone.
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setCurrentPage("dashboard");
    notifyUserChanged();
  };

  if (!authChecked) {
    return null;
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <LandingPage onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  const handleStartGame = (gameType, timeControl) => {
    if (gameType === "ai") {
      setCurrentPage("ai");
    } else if (gameType === "multi") {
      setCurrentPage("multi");
    }
    // Store time control for later use
    localStorage.setItem("selectedTimeControl", timeControl);
  };

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <Dashboard
            user={user}
            onStartGame={handleStartGame}
            onNavigate={setCurrentPage}
            onAuthError={handleLogout}
          />
        );
      case "ai": {
        const selectedTimeControl =
          localStorage.getItem("selectedTimeControl") || "3+0";
        return (
          <Chess
            onBack={() => setCurrentPage("dashboard")}
            initialAiEnabled
            timeControl={selectedTimeControl}
          />
        );
      }
      case "multi":
        return <MultiplayerChess onBack={() => setCurrentPage("dashboard")} />;
      case "history":
        return <GameHistory onBack={() => setCurrentPage("dashboard")} />;
      case "leaderboard":
        return <Leaderboard onBack={() => setCurrentPage("dashboard")} />;
      case "profile":
        return (
          <Profile user={user} onBack={() => setCurrentPage("dashboard")} />
        );
      case "settings":
        return (
          <Settings user={user} onBack={() => setCurrentPage("dashboard")} />
        );
      default:
        return (
          <div className="p-8">
            <div className="bg-[#1a1a1a] rounded-lg p-8 border border-[#2a2a2a] text-center">
              <h2 className="text-2xl font-bold text-[#e0e0e0] mb-4 font-['Montserrat']">
                Coming Soon
              </h2>
              <p className="text-[#7a7a7a] font-['Inter']">
                This feature is under development.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <DashboardLayout
        activePage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      >
        {renderContent()}
      </DashboardLayout>
    </ErrorBoundary>
  );
}
