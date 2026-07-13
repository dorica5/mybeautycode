/** Visit-based pro billing — mirrors backend env defaults. */

function readInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const mobileBillingConfig = {
  FREE_VISIT_LIMIT: readInt(
    process.env.EXPO_PUBLIC_BILLING_FREE_VISIT_LIMIT,
    10
  ),
  MONTHLY_PRICE_NOK: readInt(
    process.env.EXPO_PUBLIC_BILLING_MONTHLY_PRICE_NOK,
    199
  ),
  ANNUAL_PRICE_NOK: readInt(
    process.env.EXPO_PUBLIC_BILLING_ANNUAL_PRICE_NOK,
    1990
  ),
} as const;

export const VISIT_LIMIT_ERROR_CODE = "VISIT_LIMIT_EXCEEDED";

export type ProBillingStatus = {
  isProfessional: boolean;
  visitCount: number;
  freeVisitLimit: number;
  remainingFreeVisits: number;
  hasActiveSubscription: boolean;
  canCreateVisit: boolean;
  /** Full client history, including visits from other professionals. */
  canViewVisits: boolean;
  /** Own visits remain readable after the free limit. */
  canViewOwnVisits: boolean;
  atVisitLimit: boolean;
  monthlyPriceNok: number;
  entitlementExpiresAt: string | null;
  plan: string | null;
  discoveryAlwaysFree: true;
};

export function defaultProBillingStatus(
  overrides: Partial<ProBillingStatus> = {}
): ProBillingStatus {
  const freeVisitLimit = mobileBillingConfig.FREE_VISIT_LIMIT;
  const visitCount = overrides.visitCount ?? 0;
  return {
    isProfessional: true,
    visitCount,
    freeVisitLimit,
    remainingFreeVisits: Math.max(0, freeVisitLimit - visitCount),
    hasActiveSubscription: false,
    canCreateVisit: visitCount < freeVisitLimit,
    canViewVisits: visitCount < freeVisitLimit,
    canViewOwnVisits: true,
    atVisitLimit: visitCount >= freeVisitLimit,
    monthlyPriceNok: mobileBillingConfig.MONTHLY_PRICE_NOK,
    entitlementExpiresAt: null,
    plan: null,
    discoveryAlwaysFree: true,
    ...overrides,
  };
}

export function isVisitLimitError(err: unknown): err is Error & {
  status: number;
  code: string;
  billing?: ProBillingStatus;
} {
  if (!(err instanceof Error)) return false;
  const e = err as Error & { status?: number; code?: string };
  return e.status === 402 && e.code === VISIT_LIMIT_ERROR_CODE;
}
