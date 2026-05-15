export type BillingPlan = {
  label: string;
  amount: number;
  usdAmount: number;
  days: number;
  benefits: string[];
  entitlements: Record<string, boolean>;
};

export type BillingPlanConfig = Record<string, BillingPlan>;

