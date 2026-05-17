import LegalShell from "./LegalShell";

export default function CookiePolicyPage({ onBack }) {
  return (
    <LegalShell title="Cookie Policy" eyebrow="Legal" onBack={onBack}>
      <p>ChessPlay uses essential cookies for secure login sessions and multiplayer connectivity. These cookies keep users signed in and protect account access.</p>
      <h2>Essential Cookies</h2>
      <p>Authentication cookies are HTTP-only where possible and are required for account sessions, socket tokens, and protected API requests.</p>
      <h2>Analytics</h2>
      <p>Analytics are optional and environment-based. If no analytics provider key is configured, the app does not send analytics to a third-party provider.</p>
      <h2>Payments</h2>
      <p>Payment providers may set their own cookies when checkout is enabled. ChessPlay does not store card data.</p>
    </LegalShell>
  );
}
