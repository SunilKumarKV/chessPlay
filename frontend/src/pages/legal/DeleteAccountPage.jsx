import LegalShell from "./LegalShell";
import { useLegalSeo } from "./useLegalSeo";

const SUPPORT_EMAIL = "support@getchessplay.com";

export default function DeleteAccountPage({ onBack }) {
  useLegalSeo({
    title: "Delete Account",
    description: "How to request deletion of a ChessPlay account, what is deleted, what may be retained, and how to contact support.",
    path: "/delete-account",
  });

  return (
    <LegalShell
      title="Delete Account"
      eyebrow="Account support"
      description="You can request deletion of your ChessPlay account and associated personal data. This page is public so mobile store reviewers and users can access it without logging in."
      onBack={onBack}
    >
      <h2>How To Request Deletion</h2>
      <ol>
        <li>Open ChessPlay and go to <strong>Settings → Legal and account → Request account deletion</strong>, if available in your app version.</li>
        <li>Or email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the email address connected to your ChessPlay account.</li>
        <li>Include your ChessPlay username and the phrase "Delete my ChessPlay account" in the message.</li>
        <li>Support may ask you to verify account ownership before deletion is processed.</li>
      </ol>

      <h2>What Gets Deleted Or Anonymized</h2>
      <ul>
        <li>Account profile details such as username display, bio, avatar, and account preferences.</li>
        <li>Authentication sessions, refresh tokens, push notification device tokens, and connected device records.</li>
        <li>Private social data where possible, including direct messages, friend relationships, and support records linked only to your account.</li>
        <li>Personal identifiers attached to future leaderboard, profile, and community views.</li>
      </ul>

      <h2>What May Remain</h2>
      <p>Some records may be retained or anonymized when needed for legal, security, payment, anti-abuse, fair-play, or operational reasons. This can include completed game records, move history, payment references, moderation evidence, security logs, support audit trails, or aggregated analytics that no longer identify you directly.</p>

      <h2>Processing Time</h2>
      <p>We aim to review verified deletion requests promptly. Complex requests, payment disputes, security investigations, or incomplete verification may take longer.</p>

      <h2>FAQ</h2>
      <h3>Can I delete my account from inside the app?</h3>
      <p>If your current mobile app version includes the Settings deletion link, use it to start the request. If not, email support.</p>
      <h3>Can I recover a deleted account?</h3>
      <p>Deletion may be permanent. Some usernames, ratings, games, or messages may not be recoverable after processing.</p>
      <h3>Will my games disappear from other players' history?</h3>
      <p>Completed games may remain for integrity, ratings, anti-cheat, and opponent history, but personal identifiers may be removed or minimized.</p>

      <h2>Contact</h2>
      <p>Send deletion requests to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    </LegalShell>
  );
}
