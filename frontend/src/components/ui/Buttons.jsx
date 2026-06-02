const baseButtonClasses =
  "ds-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-xl)] px-4 py-2.5 text-sm font-black transition-[background,box-shadow,transform,color,border-color] duration-200 ease-[var(--ease-standard)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60";

const buttonVariants = {
  primary:
    "border border-transparent bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-glow)] hover:-translate-y-0.5 hover:bg-[var(--color-primary-strong)]",
  secondary:
    "border border-[var(--color-border-primary)] bg-[var(--color-surface-strong)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]",
  outline:
    "border border-[var(--color-primary)] bg-transparent text-[var(--color-primary)] hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]",
  danger:
    "border border-[color-mix(in_srgb,var(--color-danger)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)] hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--color-danger)_18%,transparent)]",
};

const buttonSizes = {
  sm: "min-h-10 rounded-[var(--radius-lg)] px-3 py-2 text-xs",
  md: "min-h-11 px-4 py-2.5 text-sm",
  lg: "min-h-12 px-5 py-3 text-base",
  icon: "h-11 w-11 px-0 py-0",
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  ...props
}) {
  return (
    <button
      className={cx(baseButtonClasses, buttonVariants[variant] || buttonVariants.primary, buttonSizes[size] || buttonSizes.md, className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current"
        />
      ) : null}
      {loading ? loadingText || children : children}
    </button>
  );
}

export const PrimaryBtn = ({ children, className = "", ...props }) => (
  <Button className={className} variant="primary" {...props}>{children}</Button>
);

export const SecondaryBtn = ({ children, className = "", ...props }) => (
  <Button className={className} variant="outline" {...props}>{children}</Button>
);

export const DangerBtn = ({ children, className = "", ...props }) => (
  <Button className={className} variant="danger" {...props}>{children}</Button>
);

export const GhostBtn = ({ children, className = "", ...props }) => (
  <Button className={className} variant="ghost" {...props}>{children}</Button>
);
