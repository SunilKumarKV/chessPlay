export const SOUND_THEMES = {
  classic: { id: "classic", label: "Classic", premium: false, note: "Wood-board move sounds." },
  modern: { id: "modern", label: "Modern", premium: false, note: "Clean app-style sound effects." },
  tournament: { id: "tournament", label: "Tournament", premium: true, note: "Serious over-the-board feel." },
  luxury: { id: "luxury", label: "Luxury", premium: true, note: "Soft premium bell sounds." },
  neon: { id: "neon", label: "Neon", premium: true, note: "Arcade-inspired chess sounds." },
  cyber: { id: "cyber", label: "Cyber", premium: true, note: "Futuristic tactical sounds." },
};

export const FREE_SOUND_THEME_IDS = Object.values(SOUND_THEMES)
  .filter((theme) => !theme.premium)
  .map((theme) => theme.id);

export function isPremiumSoundTheme(themeId) {
  return Boolean(SOUND_THEMES[themeId]?.premium);
}

export function canUseSoundTheme(themeId, user) {
  if (!isPremiumSoundTheme(themeId)) return true;
  const plan = user?.plan || user?.subscription?.plan || user?.supporterPlan;
  return Boolean(user?.isPremium || user?.isSupporter || ["monthly", "yearly", "pro", "premium"].includes(plan));
}
