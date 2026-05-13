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
import ComingSoonPage from "../pages/ComingSoonPage";
import AnalysisPage from "../pages/AnalysisPage";
import LanPlayPage from "../pages/LanPlayPage";
import AppSplash from "../components/AppSplash";
import DashboardLayout from "../layouts/DashboardLayout";
import ErrorBoundary from "../components/ErrorBoundary";
import PrivacyPolicyPage from "../pages/legal/PrivacyPolicyPage";
import TermsPage from "../pages/legal/TermsPage";
import DeleteAccountPage from "../pages/legal/DeleteAccountPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import PricingPage from "../pages/billing/PricingPage";
import BillingPage from "../pages/billing/BillingPage";
import AdminSupportersPage from "../pages/billing/AdminSupportersPage";
import HelpCenterPage from "../pages/HelpCenterPage";

function pageFromPathname(pathname) {
  if (pathname === "/reset-password") return "reset-password";
  if (pathname === "/verify-email") return "verify-email";
  return "dashboard";
}

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
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [currentPage, setCurrentPage] = useState(() =>
    pageFromPathname(window.location.pathname),
  );

  useEffect(() => {
    let cancelled = false;

    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled) {
        setAuthTimedOut(true);
        setAuthChecked(true);
      }
    }, 6000);

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
        window.clearTimeout(fallbackTimer);
        if (!cancelled) {
          setAuthTimedOut(false);
          setAuthChecked(true);
        }
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const handleLogin = (userData) => {
    localStorage.removeItem("guestMode");
    setUser(userData);
    notifyUserChanged();
  };

  const handleGuestPlay = () => {
    const guestUser = {
      id: "guest",
      username: "Guest Player",
      rating: 1200,
      isGuest: true,
    };
    localStorage.setItem("guestMode", "true");
    localStorage.setItem("selectedTimeControl", "3+0");
    setUser(guestUser);
    setCurrentPage("ai");
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
    localStorage.removeItem("guestMode");
    setUser(null);
    setCurrentPage("dashboard");
    notifyUserChanged();
  };

  if (!authChecked) {
    return <AppSplash />;
  }

  if (currentPage === "reset-password") {
    return (
      <ErrorBoundary>
        <ResetPasswordPage onBack={() => setCurrentPage("dashboard")} />
      </ErrorBoundary>
    );
  }

  if (currentPage === "verify-email") {
    return (
      <ErrorBoundary>
        <VerifyEmailPage onBack={() => setCurrentPage("dashboard")} />
      </ErrorBoundary>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <LandingPage onLogin={handleLogin} onGuestPlay={handleGuestPlay} />
      </ErrorBoundary>
    );
  }

  const handleStartGame = (gameType, timeControl) => {
    if (gameType === "ai") {
      setCurrentPage("ai");
    } else if (gameType === "multi") {
      setCurrentPage("multi");
    } else if (gameType === "local") {
      setCurrentPage("local");
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
      case "local": {
        const selectedTimeControl =
          localStorage.getItem("selectedTimeControl") || "3+0";
        return (
          <Chess
            onBack={() => setCurrentPage("dashboard")}
            initialAiEnabled={false}
            timeControl={selectedTimeControl}
            title="Play vs Player"
            opponentName="Player 2"
            playerName="Player 1"
          />
        );
      }
      case "lan":
        return (
          <LanPlayPage
            onBack={() => setCurrentPage("dashboard")}
            onStartLocal={() => setCurrentPage("local")}
          />
        );
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
      case "analysis":
        return <AnalysisPage onBack={() => setCurrentPage("dashboard")} />;
      case "pricing":
        return (
          <PricingPage
            onBack={() => setCurrentPage("dashboard")}
            onNavigate={setCurrentPage}
          />
        );
      case "billing":
        return (
          <BillingPage
            user={user}
            onBack={() => setCurrentPage("dashboard")}
            onNavigate={setCurrentPage}
          />
        );
      case "admin-supporters":
        return (
          <AdminSupportersPage onBack={() => setCurrentPage("billing")} />
        );
      case "help":
        return <HelpCenterPage onBack={() => setCurrentPage("dashboard")} onNavigate={setCurrentPage} />;
      case "puzzles":
        return (
          <ComingSoonPage
            feature={currentPage}
            onBack={() => setCurrentPage("dashboard")}
            onPlay={() => handleStartGame("ai", "3+0")}
          />
        );
      case "privacy":
        return <PrivacyPolicyPage onBack={() => setCurrentPage("dashboard")} />;
      case "terms":
        return <TermsPage onBack={() => setCurrentPage("dashboard")} />;
      case "delete-account":
        return <DeleteAccountPage onBack={() => setCurrentPage("settings")} onDeleted={handleLogout} />;
      case "forgot-password":
        return <ForgotPasswordPage onBack={() => setCurrentPage("dashboard")} />;
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
        activePage={authTimedOut ? "offline" : currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      >
        {renderContent()}
      </DashboardLayout>
    </ErrorBoundary>
  );
}
