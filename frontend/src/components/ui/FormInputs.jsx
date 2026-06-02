import { useState } from "react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fieldDescribedBy(inputId, ariaDescribedBy, error, helperText) {
  return [
    ariaDescribedBy,
    helperText ? `${inputId}-helper` : null,
    error ? `${inputId}-error` : null,
  ].filter(Boolean).join(" ") || undefined;
}

const labelClasses = "block text-sm font-bold text-[var(--color-text-primary)]";
const controlClasses =
  "ds-focus min-h-11 w-full rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] outline-none transition duration-200 placeholder:text-[var(--color-text-tertiary)] hover:border-[var(--color-border-strong)] focus-visible:border-[var(--color-focus)]";

export function FieldMessage({ id, children, tone = "helper" }) {
  if (!children) return null;
  return (
    <p
      id={id}
      role={tone === "error" ? "alert" : undefined}
      className={cx("text-xs font-semibold leading-5", tone === "error" ? "text-[var(--color-danger)]" : "text-[var(--color-text-tertiary)]")}
    >
      {children}
    </p>
  );
}

export function Input({
  label,
  error,
  helperText,
  type = "text",
  className = "",
  "aria-describedby": ariaDescribedBy,
  ...props
}) {
  const inputId = props.id || props.name;
  const describedBy = fieldDescribedBy(inputId, ariaDescribedBy, error, helperText);

  return (
    <div className="space-y-2">
      {label ? <label htmlFor={inputId} className={labelClasses}>{label}</label> : null}
      <input
        id={inputId}
        type={type}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={cx(controlClasses, className)}
        {...props}
      />
      <FieldMessage id={`${inputId}-helper`}>{helperText}</FieldMessage>
      <FieldMessage id={`${inputId}-error`} tone="error">{error}</FieldMessage>
    </div>
  );
}

export function PasswordInput({
  label,
  error,
  helperText,
  className = "",
  "aria-describedby": ariaDescribedBy,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = props.id || props.name;
  const describedBy = fieldDescribedBy(inputId, ariaDescribedBy, error, helperText);

  return (
    <div className="space-y-2">
      {label ? <label htmlFor={inputId} className={labelClasses}>{label}</label> : null}
      <div className="relative">
        <input
          id={inputId}
          type={showPassword ? "text" : "password"}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={cx(controlClasses, "pr-20", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="ds-focus absolute right-2 top-1/2 min-h-9 -translate-y-1/2 rounded-[var(--radius-lg)] px-3 text-xs font-black text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
      <FieldMessage id={`${inputId}-helper`}>{helperText}</FieldMessage>
      <FieldMessage id={`${inputId}-error`} tone="error">{error}</FieldMessage>
    </div>
  );
}

export function Select({
  label,
  error,
  helperText,
  className = "",
  children,
  "aria-describedby": ariaDescribedBy,
  ...props
}) {
  const inputId = props.id || props.name;
  const describedBy = fieldDescribedBy(inputId, ariaDescribedBy, error, helperText);

  return (
    <div className="space-y-2">
      {label ? <label htmlFor={inputId} className={labelClasses}>{label}</label> : null}
      <select
        id={inputId}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={cx(controlClasses, "appearance-none bg-[linear-gradient(45deg,transparent_50%,var(--color-text-tertiary)_50%),linear-gradient(135deg,var(--color-text-tertiary)_50%,transparent_50%)] bg-[length:5px_5px,5px_5px] bg-[position:calc(100%-20px)_50%,calc(100%-15px)_50%] bg-no-repeat pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <FieldMessage id={`${inputId}-helper`}>{helperText}</FieldMessage>
      <FieldMessage id={`${inputId}-error`} tone="error">{error}</FieldMessage>
    </div>
  );
}

export function FormTextarea({
  label,
  error,
  helperText,
  className = "",
  "aria-describedby": ariaDescribedBy,
  ...props
}) {
  const inputId = props.id || props.name;
  const describedBy = fieldDescribedBy(inputId, ariaDescribedBy, error, helperText);

  return (
    <div className="space-y-2">
      {label ? <label htmlFor={inputId} className={labelClasses}>{label}</label> : null}
      <textarea
        id={inputId}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={cx(controlClasses, "min-h-28 resize-y", className)}
        {...props}
      />
      <FieldMessage id={`${inputId}-helper`}>{helperText}</FieldMessage>
      <FieldMessage id={`${inputId}-error`} tone="error">{error}</FieldMessage>
    </div>
  );
}

export const FormInput = Input;
