/**
 * Parse / serialize `professional_hair_profiles.color_brand` as one or more names.
 * Legacy: a single plain string. Multiple: JSON `{ "brands": ["Wella", "Redken"] }`.
 */

export function parseColorBrands(raw: string | null | undefined): string[] {
  if (raw == null) return [];
  const t = String(raw).trim();
  if (!t) return [];

  if (t.startsWith("{")) {
    try {
      const o = JSON.parse(t) as { brands?: unknown };
      if (o && Array.isArray(o.brands)) {
        return o.brands.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0
        );
      }
    } catch {
      /* fall through */
    }
  }

  if (t.startsWith("[")) {
    try {
      const a = JSON.parse(t) as unknown;
      if (Array.isArray(a)) {
        return a.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0
        );
      }
    } catch {
      /* fall through */
    }
  }

  return [t];
}

/** API / DB value: `null` when empty. */
export function serializeColorBrands(brands: string[]): string | null {
  const cleaned = brands.map((b) => b.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  if (cleaned.length === 1) return cleaned[0];
  return JSON.stringify({ brands: cleaned });
}

export function colorBrandsLabel(raw: string | null | undefined): string {
  const list = parseColorBrands(raw);
  if (list.length === 0) return "";
  return list.join(", ");
}
