import { Button, EmptyState as DesignEmptyState } from "../ui";

export default function EmptyState({
  title = "Nothing here yet",
  message = "This area will appear when data is available.",
  actionLabel = "",
  onAction,
}) {
  return (
    <DesignEmptyState
      title={title}
      message={message}
      action={actionLabel && onAction ? <Button type="button" onClick={onAction}>{actionLabel}</Button> : null}
    />
  );
}
