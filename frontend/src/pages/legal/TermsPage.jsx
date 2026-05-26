import LegalShell from "./LegalShell";
import { useLegalSeo } from "./useLegalSeo";

const SUPPORT_EMAIL = "support@getchessplay.com";

export default function TermsPage({ onBack }) {
  useLegalSeo({
    title: "Terms of Service",
    description: "ChessPlay terms covering fair play, accounts, multiplayer conduct, AI and puzzle usage, supporter terms, termination, and liability.",
    path: "/terms",
  });

  return (
    <LegalShell
      title="Terms of Service"
      eyebrow="Legal"
      description="These terms govern your use of ChessPlay, including the web app, mobile app, multiplayer rooms, AI practice, puzzles, profiles, social features, and supporter experiences."
      onBack={onBack}
    >
      <p><strong>Last updated:</strong> May 27, 2026</p>

      <h2>Acceptance</h2>
      <p>By creating an account, playing a game, using guest mode, or accessing ChessPlay, you agree to these Terms of Service and the Privacy Policy.</p>

      <h2>Account Responsibility</h2>
      <ul>
        <li>You are responsible for keeping your login credentials secure.</li>
        <li>You must provide accurate account information and keep your email reachable for security and support.</li>
        <li>You may not share, sell, transfer, or impersonate accounts.</li>
        <li>You are responsible for activity that occurs through your account unless you promptly report unauthorized access.</li>
      </ul>

      <h2>Acceptable Use</h2>
      <p>You may use ChessPlay for lawful chess play, training, analysis, social features, and account management. You may not attack the service, scrape private data, bypass rate limits, exploit bugs, reverse engineer private APIs, interfere with other users, or use ChessPlay for spam, fraud, harassment, or illegal activity.</p>

      <h2>Fair Play And Anti-Cheat</h2>
      <p>Do not manipulate results, intentionally disconnect to avoid losses, abuse multiple accounts, exploit move validation bugs, or use unauthorized external assistance in competitive multiplayer games. ChessPlay may review games, room activity, device/session signals, and reports to protect fair play.</p>

      <h2>Multiplayer Conduct</h2>
      <p>Be respectful in live rooms, private messages, community areas, and support channels. Abusive chat, hate speech, threats, sexual harassment, spam, doxxing, payment scams, or targeted harassment can lead to chat restrictions, account suspension, or termination.</p>

      <h2>Puzzles, AI, And Training</h2>
      <p>AI practice, hints, evaluation, puzzles, openings, analysis, and coaching features are training tools. They may be limited, adjusted, unavailable, or inaccurate during product updates. Do not rely on ChessPlay analysis as professional advice or as a guaranteed chess result.</p>

      <h2>Premium And Supporter Terms</h2>
      <p>Supporter and premium features may include badges, themes, ad removal where ads are enabled, puzzle or analysis limits, and early-access product features. Supporter status never affects rating, matchmaking fairness, or game outcomes. Manual payments or supporter requests may require verification before benefits are enabled. Future mobile in-app purchases will follow Google Play and Apple App Store rules where applicable.</p>

      <h2>Payments And Refunds</h2>
      <p>Payment availability varies by deployment and region. If a payment or supporter request cannot be verified, contact support with your transaction reference. Refund handling depends on the payment method, payment status, benefit usage, and applicable platform rules.</p>

      <h2>Service Changes</h2>
      <p>ChessPlay may change, pause, restrict, or discontinue features to improve reliability, comply with law, prevent abuse, or support product development.</p>

      <h2>Termination</h2>
      <p>We may suspend or terminate access if you violate these terms, create security risk, abuse other users, attempt fraud, or use ChessPlay in a way that harms the service. You may stop using ChessPlay or request account deletion at any time.</p>

      <h2>Limitation Of Liability</h2>
      <p>ChessPlay is provided on an "as is" and "as available" basis. To the maximum extent allowed by law, ChessPlay is not liable for indirect, incidental, consequential, special, or punitive damages, lost data, lost profits, lost games, rating changes, service outages, or third-party service failures.</p>

      <h2>Contact</h2>
      <p>Questions about these terms can be sent to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    </LegalShell>
  );
}
