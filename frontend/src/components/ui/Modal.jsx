import { useEffect, useId, useRef } from "react";
import { Button } from "./Buttons";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
  contentClassName = "p-5 sm:p-6",
  showHeader = true,
  ...props
}) => {
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) return;

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.disabled && element.getAttribute("aria-hidden") !== "true");

      if (!focusableElements.length) {
        event.preventDefault();
        modalRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!modalRef.current.contains(document.activeElement)) {
        event.preventDefault();
        firstElement.focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    previousActiveElementRef.current = document.activeElement;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
      const focusTarget = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusTarget instanceof HTMLElement) focusTarget.focus();
      else modalRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (previousActiveElementRef.current instanceof HTMLElement) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cx(
          "ds-glass relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[var(--radius-3xl)] text-[var(--color-text-primary)]",
          className,
        )}
        {...props}
      >
        {showHeader && (title || onClose) ? (
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border-primary)] p-5 sm:p-6">
            {title ? (
              <h2 id={titleId} className="font-[var(--font-display)] text-xl font-black tracking-tight">
                {title}
              </h2>
            ) : null}
            {onClose ? (
              <Button
                type="button"
                onClick={onClose}
                variant="ghost"
                size="icon"
                aria-label="Close modal"
                className="shrink-0"
              >
                ×
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
};

export const GameOverModal = ({
  isOpen,
  onClose,
  result,
  opponent,
  newRating,
  ratingChange,
  onNewGame,
  onRematch,
  ...props
}) => {
  const resultMessage = result === "win" ? "Victory!" : result === "loss" ? "Defeat" : result === "draw" ? "Draw" : "Game Over";
  const resultTone = result === "win" ? "text-[var(--color-success)]" : result === "loss" ? "text-[var(--color-danger)]" : result === "draw" ? "text-[var(--color-warning)]" : "text-[var(--color-text-primary)]";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={resultMessage} {...props}>
      <div className="space-y-5 text-center">
        <div className={cx("text-4xl", resultTone)}>{result === "win" ? "🏆" : result === "loss" ? "×" : "="}</div>
        <div>
          <p className="font-semibold text-[var(--color-text-primary)]">
            You {result === "win" ? "defeated" : result === "loss" ? "lost to" : "drew with"} {opponent}
          </p>
          {newRating ? (
            <p className="mt-2 text-sm text-[var(--color-text-tertiary)]">
              New rating: {newRating}
              {ratingChange ? (
                <span className={ratingChange > 0 ? "ml-2 text-[var(--color-success)]" : "ml-2 text-[var(--color-danger)]"}>
                  ({ratingChange > 0 ? "+" : ""}{ratingChange})
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={onNewGame}>New Game</Button>
          {onRematch ? <Button onClick={onRematch} variant="outline">Rematch</Button> : null}
        </div>
      </div>
    </Modal>
  );
};

export const DrawOfferModal = ({ isOpen, onClose, opponent, onAccept, onDecline, ...props }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Draw Offer" {...props}>
    <div className="space-y-5 text-center">
      <div className="text-4xl" aria-hidden="true">=</div>
      <p className="font-semibold text-[var(--color-text-primary)]">{opponent} offers a draw. Do you accept?</p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={onAccept}>Accept Draw</Button>
        <Button onClick={onDecline} variant="danger">Decline</Button>
      </div>
    </div>
  </Modal>
);
