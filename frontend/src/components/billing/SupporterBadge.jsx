export default function SupporterBadge({ user }) {
  if (!user?.isSupporter && !user?.isPremium) return null;
  return (
    <span className="inline-flex items-center rounded-md border border-yellow-300/40 bg-yellow-300/10 px-2 py-1 text-xs font-bold text-yellow-200 shadow-sm">
      👑 Premium Supporter
    </span>
  );
}
