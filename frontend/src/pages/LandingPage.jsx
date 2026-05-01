import { useState } from "react";
import { PrimaryBtn, SecondaryBtn, Modal } from "../components/ui";
import Auth from "../features/auth/components/Auth";
import { useTheme } from "../hooks/useTheme";

export default function LandingPage({ onLogin }) {
  const { theme } = useTheme();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleGetStarted = () => {
    setShowAuth(true);
    setIsLogin(false); // Show signup first
  };

  const handleLoginClick = () => {
    setShowAuth(true);
    setIsLogin(true);
  };

  const handleAuthSuccess = (userData) => {
    setShowAuth(false);
    onLogin(userData);
  };

  return (
    <div
      className="min-h-screen font-['Inter']"
      style={{
        background: `linear-gradient(to bottom right, ${theme.bg.primary}, ${theme.bg.secondary}, ${theme.bg.primary})`,
        color: theme.text.primary,
      }}
    >
      {/* Header */}
      <header
        className="flex justify-between items-center p-6 border-b"
        style={{ borderColor: theme.border.primary }}
      >
        <div className="flex items-center space-x-2">
          <span className="text-2xl">♟️</span>
          <h1
            className="text-xl font-bold font-['Montserrat']"
            style={{ color: theme.text.primary }}
          >
            ChessPlay
          </h1>
        </div>
        <div className="flex space-x-4">
          <SecondaryBtn onClick={handleLoginClick}>Log In</SecondaryBtn>
          <PrimaryBtn onClick={handleGetStarted}>Sign Up</PrimaryBtn>
        </div>
      </header>

      {/* Hero Section */}
      <section className="text-center py-20 px-6">
        <h2 className="text-5xl font-bold mb-6 font-['Montserrat'] bg-linear-to-r from-[#e0e0e0] to-[#b0b0b0] bg-clip-text text-transparent">
          Play Chess Online
        </h2>
        <p
          className="text-xl mb-8 max-w-2xl mx-auto"
          style={{ color: theme.text.tertiary }}
        >
          Challenge players worldwide, improve your skills with AI, and climb
          the leaderboard in the ultimate chess experience.
        </p>
        <div className="flex justify-center space-x-4">
          <PrimaryBtn onClick={handleGetStarted} className="text-lg px-8 py-3">
            Get Started
          </PrimaryBtn>
          <SecondaryBtn onClick={() => {}} className="text-lg px-8 py-3">
            Play as Guest
          </SecondaryBtn>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h3
            className="text-3xl font-bold text-center mb-12 font-['Montserrat']"
            style={{ color: theme.text.primary }}
          >
            Why Choose ChessPlay?
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div
              className="text-center p-6 rounded-lg border"
              style={{
                backgroundColor: theme.bg.secondary,
                borderColor: theme.border.primary,
              }}
            >
              <div className="text-4xl mb-4">🤖</div>
              <h4
                className="text-xl font-semibold mb-2 font-['Montserrat']"
                style={{ color: theme.text.primary }}
              >
                Play vs AI
              </h4>
              <p style={{ color: theme.text.tertiary }}>
                Challenge our advanced AI engine with multiple difficulty levels
                and time controls.
              </p>
            </div>
            <div
              className="text-center p-6 rounded-lg border"
              style={{
                backgroundColor: theme.bg.secondary,
                borderColor: theme.border.primary,
              }}
            >
              <div className="text-4xl mb-4">👥</div>
              <h4
                className="text-xl font-semibold mb-2 font-['Montserrat']"
                style={{ color: theme.text.primary }}
              >
                Multiplayer
              </h4>
              <p style={{ color: theme.text.tertiary }}>
                Compete against players from around the world in real-time
                matches.
              </p>
            </div>
            <div
              className="text-center p-6 rounded-lg border"
              style={{
                backgroundColor: theme.bg.secondary,
                borderColor: theme.border.primary,
              }}
            >
              <div className="text-4xl mb-4">📚</div>
              <h4
                className="text-xl font-semibold mb-2 font-['Montserrat']"
                style={{ color: theme.text.primary }}
              >
                Learn & Improve
              </h4>
              <p style={{ color: theme.text.tertiary }}>
                Access puzzles, game analysis, and track your progress over
                time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-16 px-6 border-t"
        style={{
          backgroundColor: theme.bg.secondary,
          borderColor: theme.border.primary,
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h3
            className="text-3xl font-bold mb-6 font-['Montserrat']"
            style={{ color: theme.text.primary }}
          >
            Ready to Start Playing?
          </h3>
          <p className="text-xl mb-8" style={{ color: theme.text.tertiary }}>
            Join thousands of players and begin your chess journey today.
          </p>
          <PrimaryBtn onClick={handleGetStarted} className="text-lg px-8 py-3">
            Create Your Account
          </PrimaryBtn>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 px-6 border-t text-center"
        style={{
          borderColor: theme.border.primary,
          color: theme.text.tertiary,
        }}
      >
        <p>&copy; 2026 ChessPlay. Built with passion for chess enthusiasts.</p>
      </footer>

      {/* Auth Modal */}
      <Modal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        title={isLogin ? "Log In" : "Sign Up"}
        className="max-w-md"
      >
        <Auth
          onLogin={handleAuthSuccess}
          isModal={true}
          initialIsLogin={isLogin}
          onToggleMode={() => setIsLogin(!isLogin)}
        />
      </Modal>
    </div>
  );
}
