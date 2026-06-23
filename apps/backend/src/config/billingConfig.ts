/** Visit-based pro billing — tune via env without code changes. */

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const billingConfig = {
  /** Free visits before subscription is required (per professional account). */
  FREE_VISIT_LIMIT: readInt("BILLING_FREE_VISIT_LIMIT", 10),
  /** Display-only price hint for clients (actual price lives in RevenueCat). */
  MONTHLY_PRICE_NOK: readInt("BILLING_MONTHLY_PRICE_NOK", 199),
  /** RevenueCat entitlement identifier (must match dashboard). */
  ENTITLEMENT_ID: process.env.REVENUECAT_ENTITLEMENT_ID?.trim() || "premium",
  /** Dev / QA: skip all visit limits when true. */
  DEV_BYPASS:
    process.env.BILLING_DEV_BYPASS === "1" ||
    process.env.BILLING_DEV_BYPASS === "true",
} as const;

export type ProBillingStatusPayload = {
  isProfessional: boolean;
  visitCount: number;
  freeVisitLimit: number;
  remainingFreeVisits: number;
  hasActiveSubscription: boolean;
  canCreateVisit: boolean;
  canViewVisits: boolean;
  atVisitLimit: boolean;
  monthlyPriceNok: number;
  entitlementExpiresAt: string | null;
  plan: string | null;
  /** Discovery / map search is always free — surfaced for UI copy. */
  discoveryAlwaysFree: true;
};
