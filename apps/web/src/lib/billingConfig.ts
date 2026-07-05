function readInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const webBillingConfig = {
  FREE_VISIT_LIMIT: readInt(
    process.env.NEXT_PUBLIC_BILLING_FREE_VISIT_LIMIT,
    10
  ),
  MONTHLY_PRICE_NOK: readInt(
    process.env.NEXT_PUBLIC_BILLING_MONTHLY_PRICE_NOK,
    199
  ),
  ANNUAL_PRICE_NOK: readInt(
    process.env.NEXT_PUBLIC_BILLING_ANNUAL_PRICE_NOK,
    1990
  ),
} as const;

export function formatBillingTemplate(
  template: string,
  values: Record<string, string | number>
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value)),
    template
  );
}
