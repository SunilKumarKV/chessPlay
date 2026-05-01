import React, { useState, useEffect } from "react";
import Sidebar from "../features/dashboard/components/Sidebar";
import Topbar from "../features/dashboard/components/Topbar";
import { useTheme } from "../hooks/useTheme";

export default function DashboardLayout({
  children,
  rightPanel,
  activePage,
  onNavigate,
  onLogout,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const { theme, isDark } = useTheme();

  // Fetch user data for Sidebar/Topbar display
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (e) {
      console.error("Could not parse user", e);
    }
  }, []);

  return (
    <div
      className="flex h-screen font-['Inter'] w-full overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: theme.bg.quaternary,
        color: theme.text.primary,
      }}
    >
      {/* Global Navigation Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activePage={activePage}
        onNavigate={onNavigate}
        user={user}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main App Area */}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden transition-colors duration-300"
        style={{
          backgroundColor: theme.bg.quaternary,
        }}
      >
        <Topbar
          onMenuClick={() => setIsMobileMenuOpen(true)}
          user={user}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Center Content (Board / Dashboard / Profile) */}
          <main
            className="flex-1 overflow-y-auto custom-scrollbar flex items-start justify-center transition-colors duration-300"
            style={{
              backgroundColor: theme.bg.primary,
            }}
          >
            <div className="w-full h-full max-w-7xl mx-auto">{children}</div>
          </main>

          {/* Right Panel (Optional Game Info, Chat, Moves) */}
          {rightPanel && (
            <aside
              className="w-full lg:w-[380px] xl:w-[420px] border-t lg:border-t-0 lg:border-l flex flex-col flex-shrink-0 z-10 shadow-xl overflow-hidden h-[350px] lg:h-auto transition-colors duration-300"
              style={{
                backgroundColor: theme.bg.tertiary,
                borderColor: theme.border.secondary,
              }}
            >
              {rightPanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
