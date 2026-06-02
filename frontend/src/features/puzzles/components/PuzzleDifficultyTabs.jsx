import { Badge, Card } from "../../../components/ui";

const DIFFICULTIES = [
  { id: "beginner", label: "Beginner", copy: "Pattern basics" },
  { id: "intermediate", label: "Intermediate", copy: "Calculation reps" },
  { id: "advanced", label: "Advanced", copy: "Sharper tactics", premium: true },
  { id: "master", label: "Master", copy: "Deep focus", premium: true },
];

export default function PuzzleDifficultyTabs({ value, limits, onChange }) {
  const premium = Boolean(limits?.isPremium);
  return (
    <section className="grid gap-3 md:grid-cols-4" aria-label="Puzzle training level">
      {DIFFICULTIES.map((difficulty) => {
        const locked = difficulty.premium && !premium;
        return (
          <Card
            as="button"
            key={difficulty.id}
            type="button"
            onClick={() => onChange(difficulty.id)}
            interactive
            className={`text-left ${
              value === difficulty.id
                ? "border-[color-mix(in_srgb,var(--color-primary)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)]"
                : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-[var(--font-display)] text-sm font-black text-[var(--color-text-primary)]">{difficulty.label}</span>
              {locked ? <Badge tone="warning" size="sm">Premium</Badge> : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{difficulty.copy}</p>
          </Card>
        );
      })}
    </section>
  );
}
