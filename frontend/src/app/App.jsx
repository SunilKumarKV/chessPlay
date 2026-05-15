import { useEffect, useState } from "react";
import { notifyUserChanged } from "../hooks/useCurrentUser";
import { apiClient } from "../services/apiClient";
import Chess from "../features/chess/pages/ChessPage";
import LocalChessPage from "../features/chess/pages/LocalChessPage";
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
import PuzzlesPage from "../pages/PuzzlesPage";
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
import AdminPanelPage from "../pages/admin/AdminPanelPage";
import HelpCenterPage from "../pages/HelpCenterPage";
import MonetizationPage from "../pages/billing/MonetizationPage";
import ReferralPage from "../pages/billing/ReferralPage";
import TournamentsPage from "../pages/billing/TournamentsPage";
import CommunityPage from "../pages/CommunityPage";
import MessagesPage from "../pages/MessagesPage";
import AutomationPage from "../pages/AutomationPage";

const routeMap = {
  admin: "/admin",
  "admin-supporters": "/admin/supporters",
  ai: "/play",
  multi: "/play/online",
  local: "/play/local",
  lan: "/wifi",
  dashboard: "/dashboard",
  history: "/history",
  leaderboard: "/leaderboard",
  profile: "/profile",
  settings: "/settings",
  analysis: "/analysis",
  pricing: "/pricing",
  billing: "/billing",
  monetization: "/premium",
  referral: "/referral",
  tournaments: "/tournaments",
  community: "/community",
  messages: "/messages",
  automation: "/admin/automation",
  help: "/help",
  puzzles: "/puzzles",
  privacy: "/privacy",
  terms: "/terms",
  "delete-account": "/delete-account",
  "forgot-password": "/forgot-password",
  "reset-password": "/reset-password",
  "verify-email": "/verify-email",
};

function pageFromPathname(pathname) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized === "/") return "dashboard";
  if (normalized === "/admin" || normalized === "/admin/dashboard") return "admin";
  if (["/play-player", "/play/local"].includes(normalized)) return "local";
  if (["/lan", "/wifi", "/play-wifi"].includes(normalized)) return "lan";
  const entry = Object.entries(routeMap).find(([, path]) => path === normalized);
  return entry ? entry[0] : "dashboard";
}

function navigateToAppPage(page, setCurrentPage, replace = false) {
  const nextPage = routeMap[page] ? page : "dashboard";
  const nextPath = routeMap[nextPage] || "/dashboard";
  if (window.location.pathname !== nextPath) {
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({}, "", nextPath);
  }
  setCurrentPage(nextPage);
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
    const syncPageFromUrl = () => setCurrentPage(pageFromPathname(window.location.pathname));
    window.addEventListener("popstate", syncPageFromUrl);
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
        const data = await apiClient("/api/auth/session", { skipAuthRefresh: true });
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
      window.removeEventListener("popstate", syncPageFromUrl);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const handleLogin = (userData) => {
    localStorage.removeItem("guestMode");
    setUser(userData);
    navigateToAppPage("dashboard", setCurrentPage, true);
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
    navigateToAppPage("ai", setCurrentPage);
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
    sessionStorage.removeItem("chessplay_access_token");
    sessionStorage.removeItem("chessplay_socket_token");
    setUser(null);
    navigateToAppPage("dashboard", setCurrentPage, true);
    notifyUserChanged();
  };

  if (!authChecked) {
    return <AppSplash />;
  }

  if (currentPage === "forgot-password") {
    return (
      <ErrorBoundary>
        <ForgotPasswordPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
      </ErrorBoundary>
    );
  }

  if (currentPage === "reset-password") {
    return (
      <ErrorBoundary>
        <ResetPasswordPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
      </ErrorBoundary>
    );
  }

  if (currentPage === "verify-email") {
    return (
      <ErrorBoundary>
        <VerifyEmailPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
      </ErrorBoundary>
    );
  }

  if (!user && currentPage === "local") {
    const selectedTimeControl = localStorage.getItem("selectedTimeControl") || "3+0";
    return (
      <ErrorBoundary>
        <LocalChessPage
          timeControl={selectedTimeControl}
          onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
          onNavigate={(page) => navigateToAppPage(page, setCurrentPage)}
        />
      </ErrorBoundary>
    );
  }

  if (!user && currentPage === "analysis") {
    return (
      <ErrorBoundary>
        <AnalysisPage
          user={null}
          onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
          onNavigate={(page) => navigateToAppPage(page, setCurrentPage)}
        />
      </ErrorBoundary>
    );
  }

  if (!user && currentPage === "puzzles") {
    return (
      <ErrorBoundary>
        <PuzzlesPage
          user={null}
          onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
          onNavigate={(page) => navigateToAppPage(page, setCurrentPage)}
        />
      </ErrorBoundary>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <LandingPage onLogin={handleLogin} onGuestPlay={handleGuestPlay} onNavigatePath={(path) => { window.history.pushState({}, "", path); setCurrentPage(pageFromPathname(path)); }} />
      </ErrorBoundary>
    );
  }

  const handleStartGame = (gameType, timeControl) => {
    const nextPage = gameType === "multi" ? "multi" : gameType === "local" ? "local" : "ai";
    localStorage.setItem("selectedTimeControl", timeControl);
    navigateToAppPage(nextPage, setCurrentPage);
  };

  const goDashboard = () => navigateToAppPage("dashboard", setCurrentPage);

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <Dashboard
            user={user}
            onStartGame={handleStartGame}
            onNavigate={(page) => navigateToAppPage(page, setCurrentPage)}
            onAuthError={handleLogout}
          />
        );
      case "ai": {
        const selectedTimeControl =
          localStorage.getItem("selectedTimeControl") || "3+0";
        return (
          <Chess
            onBack={goDashboard}
            onNavigate={(page) => navigateToAppPage(page, setCurrentPage)}
            initialAiEnabled
            timeControl={selectedTimeControl}
          />
        );
      }
      case "multi":
        return <MultiplayerChess onBack={goDashboard} onNavigate={(page) => navigateToAppPage(page, setCurrentPage)} />;
      case "local": {
        const selectedTimeControl =
          localStorage.getItem("selectedTimeControl") || "3+0";
        return (
          <LocalChessPage
            onBack={goDashboard}
            onNavigate={(page) => navigateToAppPage(page, setCurrentPage)}
            timeControl={selectedTimeControl}
          />
        );
      }
      case "lan":
        return (
          <LanPlayPage
            user={user}
            onBack={goDashboard}
            onNavigate={(page) => navigateToAppPage(page, setCurrentPage)}
          />
        );
      case "history":
        return <GameHistory onBack={goDashboard} />;
      case "leaderboard":
        return <Leaderboard onBack={goDashboard} />;
      case "profile":
        return (
          <Profile user={user} onBack={goDashboard} />
        );
      case "settings":
        return (
          <Settings user={user} onBack={goDashboard} />
        );
      case "analysis":
        return <AnalysisPage user={user} onBack={goDashboard} onNavigate={(page) => navigateToAppPage(page, setCurrentPage)} />;
      case "pricing":
        return (
          <PricingPage
            onBack={goDashboard}
            onNavigate={(page) => navigateToAppPage(page, setCurrentPage)}
          />
        );
      case "billing":
        return (
          <BillingPage
            user={user}
            onBack={goDashboard}
            onNavigate={(page) => navigateToAppPage(page, setCurrentPage)}
          />
        );
      case "admin":
        return <AdminPanelPage user={user} onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />;
      case "admin-supporters":
        if (!user?.isAdmin) {
          return (
            <ComingSoonPage
              feature="Admin area"
              onBack={() => navigateToAppPage("billing", setCurrentPage)}
              onPlay={() => handleStartGame("ai", "3+0")}
            />
          );
        }
        return (
          <AdminSupportersPage onBack={() => navigateToAppPage("billing", setCurrentPage)} />
        );
      case "community":
        return <CommunityPage onBack={goDashboard} onNavigate={(page) => navigateToAppPage(page, setCurrentPage)} />;
      case "messages":
        return <MessagesPage onBack={goDashboard} onNavigate={(page) => navigateToAppPage(page, setCurrentPage)} />;
      case "automation":
        if (!user?.isAdmin) {
          return (
            <ComingSoonPage
              feature="Admin automation"
              onBack={goDashboard}
              onPlay={() => handleStartGame("ai", "3+0")}
            />
          );
        }
        return <AutomationPage onBack={goDashboard} />;
      case "help":
        return <HelpCenterPage onBack={goDashboard} onNavigate={(page) => navigateToAppPage(page, setCurrentPage)} />;
      case "monetization":
        return <MonetizationPage user={user} onBack={goDashboard} onNavigate={(page) => navigateToAppPage(page, setCurrentPage)} />;
      case "referral":
        return <ReferralPage onBack={goDashboard} />;
      case "tournaments":
        return <TournamentsPage onBack={goDashboard} onNavigate={(page) => navigateToAppPage(page, setCurrentPage)} />;
      case "puzzles":
        return (
          <PuzzlesPage
            user={user}
            onBack={goDashboard}
            onNavigate={(page) => navigateToAppPage(page, setCurrentPage)}
          />
        );
      case "privacy":
        return <PrivacyPolicyPage onBack={goDashboard} />;
      case "terms":
        return <TermsPage onBack={goDashboard} />;
      case "delete-account":
        return <DeleteAccountPage onBack={() => navigateToAppPage("settings", setCurrentPage)} onDeleted={handleLogout} />;
      case "forgot-password":
        return <ForgotPasswordPage onBack={goDashboard} />;
      default:
        return (
          <div className="p-8">
            <div className="bg-[#1a1a1a] rounded-lg p-8 border border-[#2a2a2a] text-center">
              <h2 className="text-2xl font-bold text-[#e0e0e0] mb-4 font-['Montserrat']">
                Feature unavailable
              </h2>
              <p className="text-[#7a7a7a] font-['Inter']">
                This page is not available for your current account or deployment configuration.
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
        onNavigate={(page) => navigateToAppPage(page, setCurrentPage)}
        onLogout={handleLogout}
      >
        {renderContent()}
      </DashboardLayout>
    </ErrorBoundary>
  );
}
