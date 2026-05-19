import { prisma } from "../config/prisma";

const plans = [
  {
    code: "free",
    name: "Free",
    description: "Core ChessPlay features for every player.",
    priceCents: 0,
    currency: "USD",
    interval: "forever",
    amountInr: 0,
    amountUsd: 0,
    durationDays: 0,
    benefits: ["Play vs AI", "Play Online", "Play vs Player", "Puzzles", "Basic analysis", "Game history"],
    entitlements: {},
  },
  {
    code: "supporter_monthly",
    name: "Supporter",
    description: "Monthly supporter access with cosmetic and quality-of-life benefits.",
    priceCents: 200,
    currency: "USD",
    interval: "monthly",
    amountInr: 49,
    amountUsd: 2,
    durationDays: 30,
    benefits: ["No ads", "Premium sounds", "Premium badge", "Priority feedback"],
    entitlements: { noAds: true, premiumSounds: true, premiumThemes: true, earlyAccess: true },
  },
  {
    code: "pro",
    name: "Premium",
    description: "Annual supporter access for released premium benefits.",
    priceCents: 2400,
    currency: "USD",
    interval: "yearly",
    amountInr: 999,
    amountUsd: 24,
    durationDays: 365,
    benefits: ["No ads", "Premium sounds", "Premium themes", "Priority feedback"],
    entitlements: {
      noAds: true,
      premiumSounds: true,
      unlimitedAnalysis: true,
      advancedEngineDepth: true,
      customBoards: true,
      premiumThemes: true,
      advancedStats: true,
      unlimitedGameReview: true,
      tournaments: true,
      earlyAccess: true,
    },
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.premiumPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }

  console.log(`Seeded ${plans.length} premium plans.`);
}

main()
  .catch((error) => {
    console.error("Premium plan seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
