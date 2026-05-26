import LegalShell from "./LegalShell";
import { useLegalSeo } from "./useLegalSeo";

const SUPPORT_EMAIL = "support@getchessplay.com";

export default function PrivacyPolicyPage({ onBack }) {
  useLegalSeo({
    title: "Privacy Policy",
    description: "ChessPlay privacy policy covering account data, gameplay data, puzzles, social features, push tokens, cookies, retention, and deletion requests.",
    path: "/privacy",
  });

  return (
    <LegalShell
      title="Privacy Policy"
      eyebrow="Legal"
      description="This policy explains how ChessPlay collects, uses, protects, and deletes information for the ChessPlay web and mobile chess experience."
      onBack={onBack}
    >
      <p><strong>Last updated:</strong> May 27, 2026</p>
      <p>ChessPlay is a chess product for online play, AI practice, puzzles, training, social features, and account-based progress. We do not sell personal information.</p>

      <h2>Information We Collect</h2>
      <ul>
        <li><strong>Account information:</strong> email address, username, password hash, login/session metadata, account status, verification status, and role.</li>
        <li><strong>Profile information:</strong> display name, avatar, country, bio, rating, supporter/premium status, selected badges, preferences, and privacy settings.</li>
        <li><strong>Gameplay data:</strong> games played, moves, board states, results, time controls, room IDs, matchmaking details, resign/draw/timeout outcomes, ratings, and game history.</li>
        <li><strong>Puzzle and training progress:</strong> puzzle attempts, hints, solved/failed status, puzzle rating, learning progress, AI practice state, and analysis notes where enabled.</li>
        <li><strong>Friends, community, and messages:</strong> friend requests, friend lists, private messages, room chat, community posts, comments, likes, moderation reports, and blocked/muted states.</li>
        <li><strong>Notifications and device tokens:</strong> Expo push tokens, platform, app version, and device identifiers needed to register or revoke mobile push notifications. We do not send push notifications unless backend delivery is enabled.</li>
        <li><strong>Support requests:</strong> support messages, payment references, bug reports, account recovery requests, attachments or screenshots you provide, and related admin notes.</li>
        <li><strong>Analytics and crash logs:</strong> diagnostic events, device/browser details, performance data, and crash logs if monitoring or analytics are enabled for a production build.</li>
      </ul>

      <h2>How We Use Information</h2>
      <ul>
        <li>Authenticate users and protect account sessions.</li>
        <li>Operate chess games, matchmaking, rooms, timers, chat, puzzles, AI practice, history, rankings, and profiles.</li>
        <li>Prevent fraud, spam, cheating, abuse, unauthorized access, and security incidents.</li>
        <li>Provide support, account recovery, payment verification, and administrative review.</li>
        <li>Improve reliability, diagnose crashes, understand product usage, and prioritize fixes.</li>
        <li>Send service notifications where enabled, such as account, game, friend, message, tournament, or security updates.</li>
      </ul>

      <h2>Cookies And Web Authentication</h2>
      <p>The web app uses cookies and browser storage for login sessions, refresh tokens, socket authentication, security checks, and user preferences. Authentication cookies are configured as HTTP-only where supported. Mobile apps use secure token storage instead of relying on browser cookies.</p>

      <h2>Mobile Push Notifications</h2>
      <p>If you grant notification permission, ChessPlay may register an Expo push token for your device. You can deny permission and continue using the app. Tokens are revoked on logout where possible and may be deleted when you request account deletion.</p>

      <h2>Third-Party Services</h2>
      <p>ChessPlay may use infrastructure and service providers for hosting, database storage, authentication, email, analytics, crash monitoring, payment/support workflows, and push notification transport. These providers process data only as needed to operate ChessPlay and are not allowed to sell it for their own purposes.</p>

      <h2>Retention</h2>
      <p>We keep account, gameplay, support, and security records for as long as needed to provide ChessPlay, meet legal obligations, resolve disputes, prevent abuse, and maintain fair-play integrity. Some anonymized gameplay or security records may remain after account deletion when required for legitimate safety, audit, or anti-cheat reasons.</p>

      <h2>Account Deletion</h2>
      <p>You can request deletion from the app settings path when available or from the <a href="/delete-account">Delete Account</a> page. You can also email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Deletion requests may require verification that you control the account email.</p>

      <h2>Children And Eligibility</h2>
      <p>ChessPlay is intended for users who can legally create and manage an online account in their location. If a parent or guardian believes a child provided personal information without proper consent, contact us for review and deletion.</p>

      <h2>Policy Updates</h2>
      <p>We may update this policy as ChessPlay evolves. Material changes will be posted on this page with a new effective date. Continued use after an update means you accept the revised policy.</p>

      <h2>Contact</h2>
      <p>Questions, privacy requests, or deletion requests can be sent to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    </LegalShell>
  );
}
