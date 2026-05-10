/**
 * Discovery specialization tags per profession lane (`professional_professions.discovery_categories`).
 * Codes are stable API keys; labels are for clients.
 */

export const DISCOVERY_OPTIONS_HAIR = [
  { code: "haircut", label: "Haircut" },
  { code: "colour", label: "Colour" },
  { code: "highlights_balayage", label: "Highlights/Balayage" },
  { code: "blowout_styling", label: "Blowout & styling" },
  { code: "hair_treatments", label: "Hair treatments" },
  { code: "bridal_hair", label: "Bridal hair" },
  { code: "makeup_hair_lane", label: "Makeup" },
] as const;

export const DISCOVERY_BROWS_BEFORE_OTHER = [
  { code: "brow_shaping_waxing", label: "Brow shaping & waxing" },
  { code: "brow_lamination", label: "Brow lamination" },
  { code: "brow_tinting", label: "Brow tinting" },
] as const;

/** Primary brows row + “Other” visit dropdown (stored in same discovery array as chips). */
export const DISCOVERY_BROWS_IN_OTHER_DROPDOWN = [
  { code: "lash_tinting", label: "Lash tinting" },
  { code: "lash_lift", label: "Lash lift" },
  { code: "lash_extensions", label: "Lash Extensions" },
  { code: "makeup_brows_lane", label: "Makeup" },
] as const;

export const DISCOVERY_OPTIONS_BROWS = [
  ...DISCOVERY_BROWS_BEFORE_OTHER,
  ...DISCOVERY_BROWS_IN_OTHER_DROPDOWN,
] as const;

export const DISCOVERY_OPTIONS_NAILS = [
  { code: "manicure", label: "Manicure" },
  { code: "pedicure", label: "Pedicure" },
  { code: "gel_acrylic", label: "Gel & acrylic" },
  { code: "nail_art", label: "Nail art" },
] as const;

const ALLOWED_HAIR = new Set(DISCOVERY_OPTIONS_HAIR.map((x) => x.code));
const ALLOWED_BROWS = new Set(DISCOVERY_OPTIONS_BROWS.map((x) => x.code));
const ALLOWED_NAILS = new Set(DISCOVERY_OPTIONS_NAILS.map((x) => x.code));

const BY_PROFESSION: Record<string, Set<string>> = {
  hair: ALLOWED_HAIR as Set<string>,
  brows_lashes: ALLOWED_BROWS as Set<string>,
  nails: ALLOWED_NAILS as Set<string>,
};

export function allowedDiscoveryCodesForProfession(
  professionCode: string
): Set<string> | null {
  return BY_PROFESSION[professionCode] ?? null;
}

/** Maps legacy compound tag to granular tags during normalization (not in allowlist alone). */
const LEGACY_BROW_LASH_ALIASES: Record<string, readonly string[]> = {
  lash_lift_tint: ["lash_tinting", "lash_lift"],
};

/** Normalizes to sorted unique codes; rejects unknown codes for the lane. */
export function normalizeDiscoveryCategoriesForProfession(
  professionCode: string,
  raw: unknown
): string[] {
  const allowed = allowedDiscoveryCodesForProfession(professionCode);
  if (!allowed) {
    throw Object.assign(
      new Error(
        "discovery_categories is only supported for hair, brows_lashes, and nails professions."
      ),
      { statusCode: 400 }
    );
  }
  if (raw === null || raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw Object.assign(
      new Error("discovery_categories must be a JSON array of strings."),
      { statusCode: 400 }
    );
  }
  const out = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string" || !item.trim()) continue;
    const c = item.trim().toLowerCase();
    const expansion = LEGACY_BROW_LASH_ALIASES[c];
    if (expansion) {
      for (const x of expansion) {
        if (!allowed.has(x)) {
          throw Object.assign(
            new Error(`Unknown discovery category for this lane: ${x}`),
            { statusCode: 400 }
          );
        }
        out.add(x);
      }
      continue;
    }
    if (!allowed.has(c)) {
      throw Object.assign(
        new Error(`Unknown discovery category for this lane: ${c}`),
        { statusCode: 400 }
      );
    }
    out.add(c);
  }
  return [...out].sort();
}
