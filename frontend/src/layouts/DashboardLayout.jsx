import React, { useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import Sidebar from "../features/dashboard/components/Sidebar";
import Topbar from "../features/dashboard/components/Topbar";

export default function DashboardLayout({
  children,
  rightPanel,
  activePage,
  onNavigate,
  onLogout,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useCurrentUser();

  return (
    <div
      className="flex h-[100dvh] min-h-screen w-full overflow-hidden bg-[linear-gradient(135deg,var(--color-bg-primary)_0%,var(--color-bg-secondary)_52%,var(--color-bg-tertiary)_100%)] font-[var(--font-sans)] text-[var(--color-text-primary)] transition-colors duration-300"
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
        className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-bg-primary)] transition-colors duration-300"
      >
        <Topbar
          onMenuClick={() => setIsMobileMenuOpen(true)}
          user={user}
          onNavigate={onNavigate}
          onLogout={onLogout}
          activePage={activePage}
        />

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Center Content (Board / Dashboard / Profile) */}
          <main
            className="custom-scrollbar flex flex-1 items-start justify-center overflow-y-auto bg-[var(--color-bg-primary)] transition-colors duration-300"
          >
            <div className="w-full min-h-full max-w-7xl mx-auto">{children}</div>
          </main>

          {/* Right Panel (Optional Game Info, Chat, Moves) */}
          {rightPanel && (
            <aside
              className="z-[var(--z-content)] flex h-[350px] w-full flex-shrink-0 flex-col overflow-hidden border-t border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)] shadow-[var(--shadow-md)] transition-colors duration-300 lg:h-auto lg:w-[380px] lg:border-l lg:border-t-0 xl:w-[420px]"
            >
              {rightPanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
