const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/** Normalizes expo-router params (string | string[] | undefined). */
export function coerceRouteParam(
  value: string | string[] | undefined
): string | undefined {
  if (value == null) return undefined;
  const s = (Array.isArray(value) ? value[0] : value).trim();
  if (!s || s === "undefined" || s === "null") return undefined;
  return s;
}
