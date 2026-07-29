import { BrandLogo } from "../../../components/brand/BrandLogo";
import { Badge, Button, Card, Input, PasswordInput } from "../../../components/ui";

const AUTH_TRUST_ITEMS = ["Secure authentication", "Privacy-first", "Free to start"];

export function PremiumAuthShell({ children, className = "" }) {
  return (
    <Card
      variant="glass"
      className={`relative mx-auto w-full max-w-[560px] overflow-hidden rounded-[var(--radius-3xl)] p-4 sm:p-8 ${className}`}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--color-info)_14%,transparent)] blur-3xl" />
      <div className="relative">{children}</div>
    </Card>
  );
}

export function PremiumAuthPage({ children }) {
  return (
    <main
      className="flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_10%,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent_30%),radial-gradient(circle_at_80%_0%,color-mix(in_srgb,var(--color-info)_14%,transparent),transparent_28%),var(--color-bg-primary)] px-4 py-6 text-[var(--color-text-primary)] sm:px-6 sm:py-10"
    >
      <div className="w-full max-w-[560px]">{children}</div>
    </main>
  );
}

export function AuthBrandHeader({ eyebrow = "Secure access", title, subtitle, headingLevel = "h1" }) {
  const Heading = headingLevel;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4 sm:mb-7">
        <BrandLogo className="h-9 w-32 text-[var(--color-text-primary)] sm:h-11 sm:w-40" />
        <Badge tone="primary" size="sm">{eyebrow}</Badge>
      </div>
      <div className="mb-4 sm:mb-6">
        <Heading className="font-[var(--font-display)] text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-4xl">{title}</Heading>
        <p className="mt-1.5 text-sm leading-6 text-[var(--color-text-secondary)] sm:text-base sm:leading-7">{subtitle}</p>
      </div>
    </>
  );
}

export function PremiumInput({ label, error, className = "", ...props }) {
  return <Input label={label} error={error} className={`sm:min-h-12 ${className}`} {...props} />;
}

export function PremiumPasswordInput({ label, error, className = "", ...props }) {
  return <PasswordInput label={label} error={error} className={`sm:min-h-12 ${className}`} {...props} />;
}

export function PrimaryAuthButton({ loading, children, loadingText, className = "", ...props }) {
  return (
    <Button
      className={`w-full sm:min-h-12 ${className}`}
      loading={loading}
      loadingText={loadingText}
      {...props}
    >
      {children}
    </Button>
  );
}

export function AuthStatus({ status, tone = "neutral" }) {
  if (!status) return null;
  const toneClass = tone === "success"
    ? "border-[color-mix(in_srgb,var(--color-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]"
    : tone === "error"
      ? "border-[color-mix(in_srgb,var(--color-danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)]"
      : "border-[var(--color-border-primary)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]";

  return (
    <div role={tone === "error" ? "alert" : "status"} className={`mt-4 rounded-[var(--radius-xl)] border p-3 text-sm font-semibold ${toneClass}`}>
      {status}
    </div>
  );
}

export function TrustIndicators({ children }) {
  return (
    <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-2.5 sm:mt-6 sm:p-3">
      <div className="flex flex-wrap justify-center gap-2 text-xs font-black text-[var(--color-text-tertiary)]">
        {AUTH_TRUST_ITEMS.map((item) => (
          <Badge key={item} tone="neutral" size="sm">{item}</Badge>
        ))}
      </div>
      {children ? <div className="mt-4 text-center">{children}</div> : null}
    </div>
  );
}
