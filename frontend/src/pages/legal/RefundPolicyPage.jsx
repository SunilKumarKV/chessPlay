import LegalShell from "./LegalShell";

export default function RefundPolicyPage({ onBack }) {
  return (
    <LegalShell title="Refund Policy" eyebrow="Legal" onBack={onBack}>
      <p>ChessPlay currently supports manual supporter payments and optional payment-provider flows. Benefits are enabled after verification.</p>
      <h2>Manual Payments</h2>
      <p>If a payment was made by mistake or cannot be verified, contact support with the payment reference. Refund eligibility depends on provider rules, payment status, and whether premium benefits were already used.</p>
      <h2>Digital Benefits</h2>
      <p>Because premium benefits are digital, refunds may be limited once access is activated. This page is a product placeholder and should be reviewed before live paid launch.</p>
      <h2>Contact</h2>
      <p>Use the contact page or support email configured for this deployment.</p>
    </LegalShell>
  );
}
