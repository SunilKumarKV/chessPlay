import LegalShell from "./LegalShell";
import WaitlistForm from "../../components/waitlist/WaitlistForm";

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "support@getchessplay.com";

export default function ContactPage({ onBack }) {
  return (
    <LegalShell title="Contact ChessPlay" eyebrow="Support" onBack={onBack}>
      <p>For account, payment, refund, or product questions, contact the ChessPlay team.</p>
      <p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
      <h2>Join updates</h2>
      <p>Join the waitlist for premium features, coaching experiments, and analysis updates.</p>
      <WaitlistForm source="contact" interest="updates" />
    </LegalShell>
  );
}
