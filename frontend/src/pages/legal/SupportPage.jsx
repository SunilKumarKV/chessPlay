import LegalShell from "./LegalShell";
import { useLegalSeo } from "./useLegalSeo";

const SUPPORT_EMAIL = "support@getchessplay.com";

const FAQS = [
  ["I cannot log in.", "Use Forgot Password first. If you still cannot access your account, email support from the account email and include your username."],
  ["A multiplayer game disconnected.", "Send the room code, approximate time, both usernames, and what each player saw. Screenshots or screen recordings help."],
  ["My payment/supporter status is not active.", "Send your transaction reference, plan selected, payment method, and account email. Manual verification may be required."],
  ["A puzzle or AI move looks wrong.", "Send the FEN, puzzle ID or game position, expected move, actual move, and device/browser details."],
];

export default function SupportPage({ onBack }) {
  useLegalSeo({
    title: "Support",
    description: "ChessPlay support center for account recovery, bug reports, payments, multiplayer issues, puzzle issues, AI issues, and response expectations.",
    path: "/support",
  });

  return (
    <LegalShell
      title="Support / Help Center"
      eyebrow="Support"
      description="Get help with ChessPlay accounts, payments, multiplayer, puzzles, AI practice, bugs, and release questions."
      onBack={onBack}
    >
      <h2>Contact</h2>
      <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Include your ChessPlay username, account email, device or browser, and a clear description of the issue.</p>

      <h2>Bug Reports</h2>
      <p>For bugs, include the page or screen, steps to reproduce, expected behavior, actual behavior, screenshot or screen recording, app version, device model, operating system, and time the problem happened.</p>

      <h2>Payment Support</h2>
      <p>For supporter, premium, UPI, PayPal, bank transfer, or payment verification issues, include the plan, payment method, transaction/reference ID, payment date, and account email. Do not send full card numbers or private banking passwords.</p>

      <h2>Account Recovery</h2>
      <p>Use the password reset flow first. If email verification, password reset, or login still fails, contact support from the account email address so we can verify ownership.</p>

      <h2>Multiplayer Issues</h2>
      <p>For room, matchmaking, reconnect, draw, resign, timeout, or chat issues, send the room code, both usernames, approximate time, and whether you were on web, Android, or iOS.</p>

      <h2>Puzzle Issues</h2>
      <p>For puzzle problems, include the puzzle ID if visible, FEN or screenshot, move you played, backend response if shown, and whether the issue happened on the daily puzzle, next puzzle, hint, or submit flow.</p>

      <h2>AI Issues</h2>
      <p>For AI move or analysis issues, include the board position, difficulty level, side to move, move history, and whether Stockfish fallback behavior was shown.</p>

      <h2>Response Expectations</h2>
      <p>ChessPlay support is handled manually. Security, account recovery, payment, and deletion requests are prioritized. Response time may vary during launch, weekends, or high-traffic releases.</p>

      <h2>FAQ</h2>
      {FAQS.map(([question, answer]) => (
        <section key={question}>
          <h3>{question}</h3>
          <p>{answer}</p>
        </section>
      ))}

      <h2>Useful Links</h2>
      <ul>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/terms">Terms of Service</a></li>
        <li><a href="/delete-account">Delete Account</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </LegalShell>
  );
}
