export default function PremiumFeatureGate({ user, children, fallback }) {
  if (user?.isPremium || user?.isSupporter) return children;
  return fallback || (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">
      <h3 className="font-black">Premium feature</h3>
      <p className="mt-1 text-sm text-amber-100/80">Upgrade to Supporter to unlock this feature.</p>
    </div>
  );
}
