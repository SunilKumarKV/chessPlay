function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const cardVariants = {
  default: "ds-elevated",
  glass: "ds-glass",
  subtle: "border border-[var(--color-border-primary)] bg-[var(--color-surface)]",
  dashed: "border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)]",
};

export function Card({ children, className = "", variant = "default", interactive = false, as = "div", ...props }) {
  const Element = as;
  return (
    <Element
      className={cx(
        "rounded-[var(--radius-2xl)] p-4 text-[var(--color-text-primary)] sm:p-5",
        cardVariants[variant] || cardVariants.default,
        interactive ? "ds-focus cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]" : "",
        className,
      )}
      {...props}
    >
      {children}
    </Element>
  );
}

export function Badge({ children, className = "", tone = "neutral", size = "md", ...props }) {
  const tones = {
    neutral: "border-[var(--color-border-primary)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
    primary: "border-[color-mix(in_srgb,var(--color-primary)_36%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-primary)]",
    success: "border-[color-mix(in_srgb,var(--color-success)_36%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]",
    warning: "border-[color-mix(in_srgb,var(--color-warning)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_14%,transparent)] text-[var(--color-warning)]",
    danger: "border-[color-mix(in_srgb,var(--color-danger)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]",
    info: "border-[color-mix(in_srgb,var(--color-info)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-info)_14%,transparent)] text-[var(--color-info)]",
  };
  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={cx("inline-flex items-center rounded-[var(--radius-full)] border font-black leading-none", tones[tone] || tones.neutral, sizes[size] || sizes.md, className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  message = "This area will appear when data is available.",
  action,
  icon = "◇",
  className = "",
}) {
  return (
    <Card variant="dashed" className={cx("p-6 text-center sm:p-8", className)}>
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-[var(--radius-xl)] bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-lg font-black text-[var(--color-primary)]" aria-hidden="true">
        {icon}
      </div>
      <h3 className="font-[var(--font-display)] text-base font-black text-[var(--color-text-primary)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--color-text-secondary)]">{message}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Card>
  );
}

export function LoadingState({ label = "Loading", className = "" }) {
  return (
    <div className={cx("flex min-h-32 items-center justify-center rounded-[var(--radius-2xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-6 text-[var(--color-text-secondary)]", className)} role="status" aria-live="polite">
      <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)]/25 border-t-[var(--color-primary)]" aria-hidden="true" />
      <span className="text-sm font-bold">{label}</span>
    </div>
  );
}

export function Tooltip({ children, content, className = "" }) {
  return (
    <span className={cx("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[var(--z-tooltip)] mb-2 max-w-64 -translate-x-1/2 rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs font-bold text-[var(--color-text-primary)] opacity-0 shadow-[var(--shadow-md)] transition group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}

export const GameCard = ({
  opponent,
  result,
  timeControl,
  moves,
  date,
  onClick,
  className = "",
  ...props
}) => {
  const resultTone = result === "win" ? "success" : result === "loss" ? "danger" : result === "draw" ? "warning" : "neutral";
  const resultText = result === "win" ? "Won" : result === "loss" ? "Lost" : result === "draw" ? "Draw" : "Unknown";

  return (
    <Card as="button" type="button" onClick={onClick} interactive className={cx("w-full text-left", className)} {...props}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-full)] bg-[var(--color-primary)] text-sm font-black text-[var(--color-primary-contrast)]">
            {opponent?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-[var(--color-text-primary)]">{opponent}</p>
            <p className="truncate text-sm text-[var(--color-text-tertiary)]">{timeControl} • {moves} moves</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm text-[var(--color-text-tertiary)] sm:inline">{date}</span>
          <Badge tone={resultTone}>{resultText}</Badge>
        </div>
      </div>
    </Card>
  );
};

export const StatCard = ({ icon, value, label, delta, deltaType = "neutral", className = "", ...props }) => {
  const deltaTone = deltaType === "positive" ? "success" : deltaType === "negative" ? "danger" : "neutral";

  return (
    <Card className={className} {...props}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-[var(--font-display)] text-2xl font-black text-[var(--color-text-primary)]">{value}</p>
          <p className="text-sm font-semibold text-[var(--color-text-tertiary)]">{label}</p>
          {delta ? <Badge className="mt-3" tone={deltaTone}>{delta}</Badge> : null}
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-xl)] bg-[var(--color-surface-strong)] text-2xl" aria-hidden="true">{icon}</div>
      </div>
    </Card>
  );
};

export const PlayerCard = ({ avatar, name, rating, isOnline = false, className = "", ...props }) => (
  <Card className={cx("flex items-center gap-3", className)} {...props}>
    <div className="relative">
      <div className="grid h-12 w-12 place-items-center rounded-[var(--radius-full)] bg-[var(--color-primary)] text-sm font-black text-[var(--color-primary-contrast)]">
        {avatar || name?.charAt(0).toUpperCase()}
      </div>
      {isOnline ? <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[var(--color-bg-secondary)] bg-[var(--color-success)]" /> : null}
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate font-bold text-[var(--color-text-primary)]">{name}</p>
      <p className="text-sm text-[var(--color-text-tertiary)]">Rating: {rating}</p>
    </div>
  </Card>
);
