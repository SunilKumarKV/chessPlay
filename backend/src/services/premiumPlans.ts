import type { PremiumPlan } from "../../generated/prisma/client";
import type { BillingPlan, BillingPlanConfig } from "../types/billing.js";
import { logger } from "../utils/logger.js";

const PUBLIC_PLAN_CODES = new Set(["supporter_monthly", "supporter_yearly", "pro"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeBenefits(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const benefits = value.map((item) => String(item || "").trim()).filter(Boolean);
  return benefits.length ? benefits : fallback;
}

function normalizeEntitlements(value: unknown, fallback: Record<string, boolean>) {
  if (!isObject(value)) return fallback;
  return Object.fromEntries(
    Object.entries(value).map(([key, enabled]) => [key, Boolean(enabled)]),
  );
}

function toBillingPlan(plan: PremiumPlan, fallback: BillingPlan): BillingPlan {
  return {
    label: plan.name || fallback.label,
    amount: plan.amountInr ?? fallback.amount,
    usdAmount: plan.amountUsd ?? fallback.usdAmount,
    days: plan.durationDays ?? fallback.days,
    benefits: normalizeBenefits(plan.benefits, fallback.benefits),
    entitlements: normalizeEntitlements(plan.entitlements, fallback.entitlements),
  };
}

async function loadPrismaPlans(fallbackPlans: BillingPlanConfig) {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("../config/prisma.js");
  const rows = await prisma.premiumPlan.findMany({
    where: {
      code: { in: Array.from(PUBLIC_PLAN_CODES) },
      isActive: true,
    },
  });

  if (!rows.length) return null;

  const plans = { ...fallbackPlans };
  for (const row of rows) {
    if (!PUBLIC_PLAN_CODES.has(row.code) || !fallbackPlans[row.code]) continue;
    plans[row.code] = toBillingPlan(row, fallbackPlans[row.code]);
  }

  return plans;
}

export async function getPremiumPlanConfig(fallbackPlans: BillingPlanConfig) {
  try {
    return (await loadPrismaPlans(fallbackPlans)) ?? fallbackPlans;
  } catch (error) {
    logger.warn("[Prisma] Premium plans unavailable; using in-memory billing plans.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackPlans;
  }
}
