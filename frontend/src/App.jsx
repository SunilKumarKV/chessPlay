import { useState, useEffect } from "react";
import Chess from "./components/Chess";
import MultiplayerChess from "./components/MultiplayerChess";
import Leaderboard from "./components/Leaderboard";
import GameHistory from "./components/GameHistory";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import Profile from "./components/Profile";
import { SidebarLink, Modal, PrimaryBtn, SecondaryBtn } from "./components/ui";
import { useSettings } from "./hooks/useSettings";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const settings = useSettings();
  const isDarkTheme = settings.getSetting("appearance", "theme") === "dark";

  useEffect(() => {
    // Check for stored auth
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuOpen && !event.target.closest('.user-menu')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setCurrentPage("dashboard");
  };

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: "🏠", active: currentPage === "dashboard" },
    { id: "ai", label: "Play vs AI", icon: "🤖", active: currentPage === "ai" },
    { id: "multi", label: "Multiplayer", icon: "👥", active: currentPage === "multi" },
    { id: "history", label: "Game History", icon: "📜", active: currentPage === "history" },
    { id: "leaderboard", label: "Leaderboard", icon: "🏆", active: currentPage === "leaderboard" },
    { id: "profile", label: "Profile", icon: "👤", active: currentPage === "profile" },
    { id: "settings", label: "Settings", icon: "⚙️", active: currentPage === "settings" },
    { id: "puzzles", label: "Puzzles", icon: "🧩", active: currentPage === "puzzles" },
    { id: "learn", label: "Learn", icon: "📚", active: currentPage === "learn" },
    { id: "community", label: "Community", icon: "👥", active: currentPage === "community" },
  ];

  // Mobile bottom navigation (5 main tabs)
  const mobileNavigation = [
    { id: "dashboard", label: "Home", icon: "🏠", active: currentPage === "dashboard" },
    { id: "ai", label: "Play", icon: "♟️", active: ["ai", "multi"].includes(currentPage) },
    { id: "puzzles", label: "Puzzle", icon: "🧩", active: currentPage === "puzzles" },
    { id: "profile", label: "Profile", icon: "👤", active: currentPage === "profile" },
    { id: "menu", label: "Menu", icon: "☰", active: false },
  ];

  if (!user) {
    return <Auth onLogin={handleLogin} />;
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
        return <Dashboard user={user} onStartGame={handleStartGame} onNavigate={setCurrentPage} />;
      case "ai":
        const selectedTimeControl = localStorage.getItem("selectedTimeControl") || "3+0";
        return <Chess onBack={() => setCurrentPage("dashboard")} initialAiEnabled timeControl={selectedTimeControl} />;
      case "multi":
        return <MultiplayerChess onBack={() => setCurrentPage("dashboard")} />;
      case "history":
        return <GameHistory onBack={() => setCurrentPage("dashboard")} />;
      case "leaderboard":
        return <Leaderboard onBack={() => setCurrentPage("dashboard")} />;
      case "profile":
        return <Profile user={user} onBack={() => setCurrentPage("dashboard")} />;
      case "settings":
        return <Settings user={user} onBack={() => setCurrentPage("dashboard")} />;
      default:
        return (
          <div className="p-8">
            <div className="bg-[#1a1a1a] rounded-lg p-8 border border-[#2a2a2a] text-center">
              <h2 className="text-2xl font-bold text-[#e0e0e0] mb-4 font-['Montserrat']">Coming Soon</h2>
              <p className="text-[#7a7a7a] font-['Inter']">This feature is under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen ${isDarkTheme ? 'bg-[#0e0e0e] text-[#e0e0e0]' : 'bg-[#f5f5f5] text-[#1a1a1a]'} flex font-['Inter']`}>
      {/* Mobile Bottom Navigation */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 ${isDarkTheme ? 'bg-[#1a1a1a] border-t border-[#2a2a2a]' : 'bg-white border-t border-gray-200'} z-20`}>
        <div className="flex">
          {mobileNavigation.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "menu") {
                  setMobileMenuOpen(!mobileMenuOpen);
                } else if (item.id === "profile") {
                  setCurrentPage("profile");
                } else {
                  setCurrentPage(item.id);
                  setMobileMenuOpen(false);
                }
              }}
              className={`flex-1 flex flex-col items-center py-3 px-2 transition-all duration-200 ${
                item.active
                  ? 'text-[#81b64c] bg-[#81b64c]/10'
                  : 'text-[#7a7a7a] hover:text-[#e0e0e0]'
              }`}
            >
              <span className="text-lg mb-1">{item.icon}</span>
              <span className="text-xs font-medium font-['Inter']">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className={`absolute bottom-16 left-4 right-4 ${isDarkTheme ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden`}>
            {[
              { id: "history", label: "Game History", icon: "📜" },
              { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
              { id: "settings", label: "Settings", icon: "⚙️" },
              { id: "learn", label: "Learn", icon: "📚" },
              { id: "community", label: "Community", icon: "👥" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left ${isDarkTheme ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-100'} transition-colors`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium font-['Inter']">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sidebar - Hidden on mobile and tablet */}
      <aside className={`hidden lg:flex ${sidebarCollapsed ? 'w-16' : 'w-60'} ${isDarkTheme ? 'bg-[#1a1a1a] border-r border-[#2a2a2a]' : 'bg-white border-r border-gray-200'} flex-col transition-all duration-300 fixed h-full z-10`}>
        {/* Logo */}
        <div className={`p-6 ${isDarkTheme ? 'border-b border-[#2a2a2a]' : 'border-b border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">♟️</div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-[#81b64c] font-['Montserrat']">Chess Pro</h1>
                <p className="text-xs text-[#7a7a7a] font-['Inter']">Master the Game</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.id}>
                <SidebarLink
                  icon={item.icon}
                  label={item.label}
                  isActive={item.active}
                  isCollapsed={sidebarCollapsed}
                  onClick={() => setCurrentPage(item.id)}
                  isDarkTheme={isDarkTheme}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-[#2a2a2a]">
          <button
            onClick={() => setCurrentPage("profile")}
            className="w-full flex items-center space-x-3 hover:bg-[#2a2a2a] rounded-lg p-2 transition-colors"
          >
            <div className="w-10 h-10 bg-[#81b64c] rounded-full flex items-center justify-center text-[#0e0e0e] font-bold font-['Montserrat']">
              {user.username?.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-[#e0e0e0] truncate font-['Inter']">{user.username}</p>
                <p className="text-xs text-[#7a7a7a] font-['Inter']">Rating: {user.rating || 1200}</p>
              </div>
            )}
          </button>
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-4 border-t border-[#2a2a2a] text-[#7a7a7a] hover:text-[#e0e0e0] transition-colors"
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'} transition-all duration-300 pb-16 md:pb-0`}>
        {/* Top Navbar */}
        <header className={`${isDarkTheme ? 'bg-[#1a1a1a] border-b border-[#2a2a2a]' : 'bg-white border-b border-gray-200'} px-4 md:px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              {/* Sidebar toggle for medium screens */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`lg:hidden ${isDarkTheme ? 'text-[#7a7a7a] hover:text-[#e0e0e0]' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
              >
                ☰
              </button>

              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search games, players..."
                  className={`w-full ${isDarkTheme ? 'bg-[#2a2a2a] border-[#2a2a2a] text-[#e0e0e0] placeholder-[#7a7a7a]' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'} rounded-lg px-4 py-2 focus:outline-none focus:border-[#81b64c] font-['Inter'] text-sm`}
                />
                <div className="absolute right-3 top-2.5 text-[#7a7a7a]">🔍</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setQuickSettingsOpen(true)}
                className={`${isDarkTheme ? 'text-[#7a7a7a] hover:text-[#e0e0e0]' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
                title="Quick Settings"
              >
                ⚙️
              </button>
              <button className={`${isDarkTheme ? 'text-[#7a7a7a] hover:text-[#e0e0e0]' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                🔔
              </button>
              <button
                onClick={() => {
                  const newTheme = isDarkTheme ? "light" : "dark";
                  settings.updateSetting("appearance", "theme", newTheme);
                }}
                className={`${isDarkTheme ? 'text-[#7a7a7a] hover:text-[#e0e0e0]' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
              >
                {isDarkTheme ? '☀️' : '🌙'}
              </button>
              <div className="relative user-menu">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center space-x-2 ${isDarkTheme ? 'text-[#e0e0e0] hover:text-[#81b64c]' : 'text-gray-900 hover:text-[#81b64c]'} transition-colors`}
                >
                  <div className="w-8 h-8 bg-[#81b64c] rounded-full flex items-center justify-center text-[#0e0e0e] font-bold font-['Montserrat']">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:inline font-['Inter']">{user.username}</span>
                  <span>▼</span>
                </button>

                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className={`absolute right-0 mt-2 w-48 ${isDarkTheme ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-50`}>
                    <div className={`p-3 ${isDarkTheme ? 'border-b border-[#2a2a2a]' : 'border-b border-gray-200'}`}>
                      <p className={`text-sm font-medium ${isDarkTheme ? 'text-[#e0e0e0]' : 'text-gray-900'} font-['Inter']`}>{user.username}</p>
                      <p className={`text-xs ${isDarkTheme ? 'text-[#7a7a7a]' : 'text-gray-500'} font-['Inter']`}>Rating: {user.rating || 1200}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setCurrentPage("settings");
                          setUserMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm ${isDarkTheme ? 'text-[#e0e0e0] hover:bg-[#2a2a2a]' : 'text-gray-900 hover:bg-gray-100'} font-['Inter']`}
                      >
                        ⚙️ Settings
                      </button>
                      <button
                        onClick={() => {
                          handleLogout();
                          setUserMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm ${isDarkTheme ? 'text-[#e0e0e0] hover:bg-[#2a2a2a]' : 'text-gray-900 hover:bg-gray-100'} font-['Inter']`}
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`min-h-[calc(100vh-80px)] ${isDarkTheme ? 'bg-[#0e0e0e]' : 'bg-[#f5f5f5]'}`}>
          {renderContent()}
        </main>
      </div>

      {/* Quick Settings Modal */}
      <Modal
        isOpen={quickSettingsOpen}
        onClose={() => setQuickSettingsOpen(false)}
        title="Quick Settings"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-[#e0e0e0] mb-4 font-['Montserrat']">Display</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className={`${isDarkTheme ? 'text-[#e0e0e0]' : 'text-gray-900'} font-['Inter']`}>Dark Mode</span>
                <button
                  onClick={() => {
                    const newTheme = isDarkTheme ? "light" : "dark";
                    settings.updateSetting("appearance", "theme", newTheme);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    isDarkTheme ? 'bg-[#81b64c]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    isDarkTheme ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </label>
              <label className="flex items-center justify-between">
                <span className={`${isDarkTheme ? 'text-[#e0e0e0]' : 'text-gray-900'} font-['Inter']`}>Sidebar Collapsed</span>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    sidebarCollapsed ? 'bg-[#81b64c]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    sidebarCollapsed ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </label>
            </div>
          </div>

          <div className="flex space-x-3 justify-end">
            <SecondaryBtn onClick={() => setQuickSettingsOpen(false)}>
              Close
            </SecondaryBtn>
            <PrimaryBtn onClick={() => setCurrentPage("settings")}>
              Full Settings
            </PrimaryBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
