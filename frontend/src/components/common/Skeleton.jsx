export function SkeletonBlock({ className = "h-24" }) {
  return <div className={`animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] ${className}`} />;
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading">
      {Array.from({ length: count }).map((_, index) => <SkeletonBlock key={index} className="h-32" />)}
    </div>
  );
}
