import { lazy, Suspense, useEffect, useState } from "react";
import { notifyUserChanged } from "../hooks/useCurrentUser";
import { apiClient } from "../services/apiClient";
const Chess = lazy(() => import("../features/chess/pages/ChessPage"));
const LocalChessPage = lazy(() => import("../features/chess/pages/LocalChessPage"));
const MultiplayerChess = lazy(() => import("../features/chess/components/MultiplayerChess"));
const Leaderboard = lazy(() => import("../pages/LeaderboardPage"));
const GameHistory = lazy(() => import("../pages/GameHistoryPage"));
import LandingPage from "../pages/LandingPage";
const Dashboard = lazy(() => import("../pages/DashboardPage"));
const Settings = lazy(() => import("../pages/SettingsPage"));
const Profile = lazy(() => import("../pages/ProfilePage"));
const ComingSoonPage = lazy(() => import("../pages/ComingSoonPage"));
const AnalysisPage = lazy(() => import("../pages/AnalysisPage"));
const LanPlayPage = lazy(() => import("../pages/LanPlayPage"));
const PuzzlesPage = lazy(() => import("../pages/PuzzlesPage"));
import AppSplash from "../components/AppSplash";
const DashboardLayout = lazy(() => import("../layouts/DashboardLayout"));
import ErrorBoundary from "../components/ErrorBoundary";
const PrivacyPolicyPage = lazy(() => import("../pages/legal/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("../pages/legal/TermsPage"));
const DeleteAccountPage = lazy(() => import("../pages/legal/DeleteAccountPage"));
const SupportPage = lazy(() => import("../pages/legal/SupportPage"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("../pages/VerifyEmailPage"));
const PricingPage = lazy(() => import("../pages/billing/PricingPage"));
const BillingPage = lazy(() => import("../pages/billing/BillingPage"));
const AdminSupportersPage = lazy(() => import("../pages/billing/AdminSupportersPage"));
const AdminPanelPage = lazy(() => import("../pages/admin/AdminPanelPage"));
const HelpCenterPage = lazy(() => import("../pages/HelpCenterPage"));
const MonetizationPage = lazy(() => import("../pages/billing/MonetizationPage"));
const ReferralPage = lazy(() => import("../pages/billing/ReferralPage"));
const TournamentsPage = lazy(() => import("../pages/billing/TournamentsPage"));
const CommunityPage = lazy(() => import("../pages/CommunityPage"));
const MessagesPage = lazy(() => import("../pages/MessagesPage"));
const AutomationPage = lazy(() => import("../pages/AutomationPage"));
const FeedbackButton = lazy(() => import("../components/feedback/FeedbackButton"));
const ReduxProvider = lazy(() => import("../store/ReduxProvider"));
const RefundPolicyPage = lazy(() => import("../pages/legal/RefundPolicyPage"));
const CookiePolicyPage = lazy(() => import("../pages/legal/CookiePolicyPage"));
const ContactPage = lazy(() => import("../pages/legal/ContactPage"));
const SeoLandingPage = lazy(() => import("../pages/seo/SeoLandingPage"));
const CoachingPage = lazy(() => import("../pages/growth/CoachingPage"));
const StorePage = lazy(() => import("../pages/growth/StorePage"));
const ServicesPage = lazy(() => import("../pages/growth/ServicesPage"));
const OpeningExplorerPage = lazy(() => import("../pages/growth/OpeningExplorerPage"));
const PaymentStatusPage = lazy(() => import("../pages/billing/PaymentStatusPage"));
import { getGuestFeatureMessage, isGuestRestrictedFeature, isGuestUser } from "../utils/guestAccess";
import { trackEvent } from "../services/analytics";

const REDUX_PAGES = new Set(["ai", "local", "settings"]);

function getStoredUser() {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null;
  }
}

function runWhenIdle(callback) {
  if ("requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, { timeout: 1800 });
  }
  return window.setTimeout(callback, 350);
}

function cancelIdleRun(id) {
  if ("cancelIdleCallback" in window) window.cancelIdleCallback(id);
  else window.clearTimeout(id);
}

function RouteFrame({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<AppSplash />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function RouteProviders({ page, children }) {
  if (!REDUX_PAGES.has(page)) return children;
  return <ReduxProvider>{children}</ReduxProvider>;
}

function DeferredFeedbackButton({ user }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const idleId = runWhenIdle(() => setVisible(true));
    return () => cancelIdleRun(idleId);
  }, []);

  return visible ? <FeedbackButton user={user} /> : null;
}

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
  referrals: "/referrals",
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
  "payment-success": "/payment/success",
  "payment-failed": "/payment/failed",
};

function pageFromPathname(pathname) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized === "/") return "dashboard";
  if (normalized === "/privacy-policy") return "privacy-policy";
  if (normalized === "/payment/success") return "payment-success";
  if (normalized === "/payment/failed") return "payment-failed";
  if (normalized === "/referrals") return "referrals";
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
  const [user, setUser] = useState(getStoredUser);
  const [authChecked, setAuthChecked] = useState(() => !getStoredUser());
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
        let data = await apiClient("/api/auth/session", { skipAuthRefresh: true });
        if (cancelled) return;

        if (!data.user && localStorage.getItem("user")) {
          try {
            await apiClient("/api/auth/refresh", { method: "POST" });
            data = await apiClient("/api/auth/session", { skipAuthRefresh: true });
            if (cancelled) return;
          } catch {
            // Refresh failed; fall through to clear stale local session below.
          }
        }

        const nextUser = data.user || null;
        if (nextUser) {
          localStorage.setItem("user", JSON.stringify(nextUser));
        } else {
          localStorage.removeItem("user");
        }
        setUser(nextUser);
        notifyUserChanged();
      } catch {
        if (!cancelled && !localStorage.getItem("user")) {
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

    const restoreTimer = user ? window.setTimeout(restoreSession, 0) : runWhenIdle(restoreSession);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", syncPageFromUrl);
      window.clearTimeout(fallbackTimer);
      if (user) window.clearTimeout(restoreTimer);
      else cancelIdleRun(restoreTimer);
    };
  }, [user]);

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
      <RouteFrame>
        <ForgotPasswordPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
      </RouteFrame>
    );
  }

  if (currentPage === "reset-password") {
    return (
      <RouteFrame>
        <ResetPasswordPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
      </RouteFrame>
    );
  }

  if (currentPage === "verify-email") {
    return (
      <RouteFrame>
        <VerifyEmailPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
      </RouteFrame>
    );
  }

  if (currentPage === "payment-success" || currentPage === "payment-failed") {
    return (
      <RouteFrame>
        <PaymentStatusPage status={currentPage === "payment-success" ? "success" : "failed"} onNavigate={guardedNavigate} />
        <DeferredFeedbackButton user={user} />
      </RouteFrame>
    );
  }

  if (["privacy", "privacy-policy", "terms", "delete-account", "support", "refund-policy", "cookie-policy", "contact", "chess-puzzles", "play-chess-online", "chess-ai", "chess-analysis", "coaching", "openings", "opening-explorer", "store", "hire-me", "services"].includes(currentPage)) {
    const page = currentPage === "privacy" || currentPage === "privacy-policy"
      ? <PrivacyPolicyPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
      : currentPage === "terms"
        ? <TermsPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
        : currentPage === "delete-account"
          ? <DeleteAccountPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
          : currentPage === "support"
            ? <SupportPage onBack={() => navigateToAppPage("dashboard", setCurrentPage)} />
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
    return <RouteFrame>{page}<DeferredFeedbackButton user={user} /></RouteFrame>;
  }

  if (!user && currentPage === "local") {
    const selectedTimeControl = localStorage.getItem("selectedTimeControl") || "3+0";
    return (
      <RouteFrame>
        <RouteProviders page={currentPage}>
          <LocalChessPage
            timeControl={selectedTimeControl}
            onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
            onNavigate={guardedNavigate}
          />
        </RouteProviders>
      </RouteFrame>
    );
  }

  if (!user && currentPage === "analysis") {
    return (
      <RouteFrame>
        <AnalysisPage
          user={null}
          onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
          onNavigate={guardedNavigate}
        />
      </RouteFrame>
    );
  }

  if (!user && (currentPage === "pricing" || currentPage === "monetization")) {
    return (
      <RouteFrame>
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
      </RouteFrame>
    );
  }

  if (!user && currentPage === "leaderboard") {
    return (
      <RouteFrame>
        <Leaderboard
          user={null}
          onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
          onNavigate={guardedNavigate}
        />
      </RouteFrame>
    );
  }

  if (!user && currentPage === "puzzles") {
    return (
      <RouteFrame>
        <PuzzlesPage
          user={null}
          onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
          onNavigate={guardedNavigate}
        />
      </RouteFrame>
    );
  }

  if (!user && (currentPage === "referral" || currentPage === "referrals")) {
    return (
      <RouteFrame>
        <ReferralPage
          onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
          onNavigate={guardedNavigate}
        />
        <DeferredFeedbackButton user={null} />
      </RouteFrame>
    );
  }

  if (!user && currentPage === "profile-public") {
    return (
      <RouteFrame>
        <Profile
          user={null}
          username={profileUsernameFromPathname(window.location.pathname)}
          onBack={() => navigateToAppPage("dashboard", setCurrentPage)}
          onNavigate={guardedNavigate}
        />
      </RouteFrame>
    );
  }

  if (!user) {
    return (
      <RouteFrame>
        <LandingPage onLogin={handleLogin} onGuestPlay={handleGuestPlay} onNavigatePath={(path) => { window.history.pushState({}, "", path); setCurrentPage(pageFromPathname(path)); }} />
      </RouteFrame>
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
        return (
          <PricingPage
            user={user}
            onBack={goDashboard}
            onNavigate={guardedNavigate}
          />
        );
      case "support":
        return <SupportPage onBack={goDashboard} />;
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
      case "referrals":
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
    <RouteFrame>
      <DashboardLayout
        activePage={authTimedOut ? "offline" : currentPage}
        onNavigate={guardedNavigate}
        onLogout={handleLogout}
      >
        <RouteProviders page={currentPage}>{renderContent()}</RouteProviders>
      </DashboardLayout>
      <DeferredFeedbackButton user={user} />
    </RouteFrame>
  );
}
