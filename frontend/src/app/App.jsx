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
import FeedbackButton from "../components/feedback/FeedbackButton";
import RefundPolicyPage from "../pages/legal/RefundPolicyPage";
import CookiePolicyPage from "../pages/legal/CookiePolicyPage";
import ContactPage from "../pages/legal/ContactPage";
import SeoLandingPage from "../pages/seo/SeoLandingPage";
import CoachingPage from "../pages/growth/CoachingPage";
import StorePage from "../pages/growth/StorePage";
import ServicesPage from "../pages/growth/ServicesPage";
import OpeningExplorerPage from "../pages/growth/OpeningExplorerPage";
import { getGuestFeatureMessage, isGuestRestrictedFeature, isGuestUser } from "../utils/guestAccess";
import { trackEvent } from "../services/analytics";

const routeMap = {
  admin: "/admin",
  "admin-supporters": "/admin/payments",
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
  support: "/support",
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
  "privacy-policy": "/privacy-policy",
  terms: "/terms",
  "refund-policy": "/refund-policy",
  "cookie-policy": "/cookie-policy",
  contact: "/contact",
  "chess-puzzles": "/chess-puzzles",
  "play-chess-online": "/play-chess-online",
  "chess-ai": "/chess-ai",
  "chess-analysis": "/chess-analysis",
  coaching: "/coaching",
  openings: "/openings",
  "opening-explorer": "/opening-explorer",
  store: "/store",
  "hire-me": "/hire-me",
  services: "/services",
  "delete-account": "/delete-account",
  "forgot-password": "/forgot-password",
  "reset-password": "/reset-password",
  "verify-email": "/verify-email",
};

function pageFromPathname(pathname) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized === "/") return "dashboard";
  if (normalized === "/privacy-policy") return "privacy-policy";
  if (normalized === "/privacy") return "privacy";
  if (normalized === "/admin" || normalized === "/admin/dashboard") return "admin";
  if (normalized.startsWith("/profile/") && normalized.split("/")[2]) return "profile-public";
  if (["/admin/payments", "/admin/supporters"].includes(normalized)) return "admin-supporters";
  if (["/play-player", "/play/local"].includes(normalized)) return "local";
  if (["/lan", "/wifi", "/play-wifi"].includes(normalized)) return "lan";
  const entry = Object.entries(routeMap).find(([, path]) => path === normalized);
  return entry ? entry[0] : "dashboard";
}

function profileUsernameFromPathname(pathname) {
  const parts = pathname.replace(/\/$/, "").split("/");
  if (parts[1] === "profile" && parts[2]) return decodeURIComponent(parts[2]);
  return null;
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

  const isGuestSession = isGuestUser(user);

  const guardedNavigate = (page) => {
    if (isGuestUser(user) && isGuestRestrictedFeature(page)) {
      navigateToAppPage(page, setCurrentPage);
      return;
    }
    navigateToAppPage(page, setCurrentPage);
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

  if (["privacy", "privacy-policy", "terms", "refund-policy", "cookie-policy", "contact", "chess-puzzles", "play-chess-online", "chess-ai", "chess-analysis", "coaching", "openings", "opening-explorer", "store", "hire-me", "services"].includes(currentPage)) {
    const page = currentPage === "privacy" || currentPage === "privacy-policy"
      ? <PrivacyPolicyPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
      : currentPage === "terms"
        ? <TermsPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
        : currentPage === "refund-policy"
          ? <RefundPolicyPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
          : currentPage === "cookie-policy"
            ? <CookiePolicyPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
            : currentPage === "contact"
              ? <ContactPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
              : currentPage === "coaching"
                ? <CoachingPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
                : currentPage === "openings" || currentPage === "opening-explorer"
                  ? <OpeningExplorerPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
                : currentPage === "store"
                  ? <StorePage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
                  : currentPage === "hire-me" || currentPage === "services"
                    ? <ServicesPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
                    : <SeoLandingPage page={currentPage} onBack={() => navigateToAppPage("dashboard", setCurrentPage)} onNavigate={guardedNavigate} />;
    return <ErrorBoundary>{page}<FeedbackButton user={user} /></ErrorBoundary>;
  }

  if (!user && currentPage === "local") {
    const selectedTimeControl = localStorage.getItem("selectedTimeControl") || "3+0";
    return (
      <ErrorBoundary>
        <LocalChessPage
          timeControl={selectedTimeControl}
          onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
          onNavigate={guardedNavigate}
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
          onNavigate={guardedNavigate}
        />
      </ErrorBoundary>
    );
  }

  if (!user && (currentPage === "pricing" || currentPage === "support" || currentPage === "monetization")) {
    return (
      <ErrorBoundary>
        {currentPage === "monetization" ? (
          <MonetizationPage
            user={null}
            onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
            onNavigate={guardedNavigate}
          />
        ) : (
        <PricingPage
          user={null}
          onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
          onNavigate={guardedNavigate}
        />
        )}
      </ErrorBoundary>
    );
  }

  if (!user && currentPage === "leaderboard") {
    return (
      <ErrorBoundary>
        <Leaderboard
          user={null}
          onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
          onNavigate={guardedNavigate}
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
          onNavigate={guardedNavigate}
        />
      </ErrorBoundary>
    );
  }

  if (!user && currentPage === "profile-public") {
    return (
      <ErrorBoundary>
        <Profile
          user={null}
          username={profileUsernameFromPathname(window.location.pathname)}
          onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
          onNavigate={guardedNavigate}
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
    trackEvent(gameType === "multi" ? "multiplayer_start" : "play_ai", { timeControl });
    guardedNavigate(nextPage);
  };

  const goDashboard = () => navigateToAppPage("dashboard", setCurrentPage);

  const renderGuestAccessPrompt = () => (
    <ComingSoonPage
      feature="Login Required"
      onBack={goDashboard}
      onPlay={() => handleStartGame("ai", localStorage.getItem("selectedTimeControl") || "3+0")}
    />
  );

  const renderContent = () => {
    if (isGuestSession && isGuestRestrictedFeature(currentPage)) {
      return (
        <div className="w-full">
          <div className="mx-auto mt-4 max-w-5xl px-4">
            <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-bold text-amber-100">
              {getGuestFeatureMessage(currentPage)} Guest mode is limited to basic Play vs AI and local board practice.
            </div>
          </div>
          {renderGuestAccessPrompt()}
        </div>
      );
    }

    switch (currentPage) {
      case "dashboard":
        return (
          <Dashboard
            user={user}
            onStartGame={handleStartGame}
            onNavigate={guardedNavigate}
            onAuthError={handleLogout}
          />
        );
      case "ai": {
        const selectedTimeControl =
          localStorage.getItem("selectedTimeControl") || "3+0";
        return (
          <Chess
            onBack={goDashboard}
            onNavigate={guardedNavigate}
            initialAiEnabled
            timeControl={selectedTimeControl}
          />
        );
      }
      case "multi":
        return <MultiplayerChess onBack={goDashboard} onNavigate={guardedNavigate} />;
      case "local": {
        const selectedTimeControl =
          localStorage.getItem("selectedTimeControl") || "3+0";
        return (
          <LocalChessPage
            onBack={goDashboard}
            onNavigate={guardedNavigate}
            timeControl={selectedTimeControl}
          />
        );
      }
      case "lan":
        return (
          <LanPlayPage
            user={user}
            onBack={goDashboard}
            onNavigate={guardedNavigate}
          />
        );
      case "history":
        return <GameHistory onBack={goDashboard} />;
      case "leaderboard":
        return <Leaderboard user={user} onBack={goDashboard} onNavigate={guardedNavigate} />;
      case "profile":
        return (
          <Profile user={user} onBack={goDashboard} onNavigate={guardedNavigate} />
        );
      case "profile-public":
        return (
          <Profile
            user={user}
            username={profileUsernameFromPathname(window.location.pathname)}
            onBack={goDashboard}
            onNavigate={guardedNavigate}
          />
        );
      case "settings":
        return (
          <Settings user={user} onBack={goDashboard} onNavigate={guardedNavigate} />
        );
      case "analysis":
        return <AnalysisPage user={user} onBack={goDashboard} onNavigate={guardedNavigate} />;
      case "pricing":
      case "support":
        return (
          <PricingPage
            user={user}
            onBack={goDashboard}
            onNavigate={guardedNavigate}
          />
        );
      case "billing":
        return (
          <BillingPage
            user={user}
            onBack={goDashboard}
            onNavigate={guardedNavigate}
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
        return <CommunityPage user={user} onBack={goDashboard} onNavigate={guardedNavigate} />;
      case "messages":
        return <MessagesPage onBack={goDashboard} onNavigate={guardedNavigate} />;
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
        return <HelpCenterPage onBack={goDashboard} onNavigate={guardedNavigate} />;
      case "monetization":
        return <MonetizationPage user={user} onBack={goDashboard} onNavigate={guardedNavigate} />;
      case "referral":
        return <ReferralPage onBack={goDashboard} onNavigate={guardedNavigate} />;
      case "tournaments":
        return <TournamentsPage user={user} onBack={goDashboard} onNavigate={guardedNavigate} />;
      case "puzzles":
        return (
          <PuzzlesPage
            user={user}
            onBack={goDashboard}
            onNavigate={guardedNavigate}
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
        onNavigate={guardedNavigate}
        onLogout={handleLogout}
      >
        {renderContent()}
      </DashboardLayout>
      <FeedbackButton user={user} />
    </ErrorBoundary>
  );
}
