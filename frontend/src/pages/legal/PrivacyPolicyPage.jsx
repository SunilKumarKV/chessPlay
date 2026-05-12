export default function PrivacyPolicyPage({ onBack }) {
  return (
    <main className="min-h-screen bg-[var(--bg-primary,#0b0f14)] px-6 py-10 text-[var(--text-primary,#f8fafc)]">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <button onClick={onBack} className="mb-6 rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/10">← Back</button>
        <h1 className="mb-3 text-3xl font-black">Privacy Policy</h1>
        <p className="mb-6 text-sm text-slate-400">Last updated: May 2026</p>
        <div className="space-y-4 text-slate-300">
          <p>ChessPlay collects only the account and gameplay data required to provide authentication, multiplayer rooms, game history, leaderboard, and profile features.</p>
          <p>Authentication tokens are stored in HttpOnly cookies. Passwords are hashed with bcrypt and are never stored as plain text.</p>
          <p>We do not sell user data. Users can request account deletion from the app settings or delete-account page.</p>
          <p>Production deployments should enable MongoDB Atlas backups, Sentry monitoring, Cloudflare protection, and secret rotation.</p>
        </div>
      </div>
    </main>
  );
}
