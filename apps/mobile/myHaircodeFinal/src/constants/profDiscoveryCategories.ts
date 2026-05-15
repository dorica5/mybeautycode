import type { ProfessionChoiceCode } from "./professionCodes";

export type DiscoveryCategoryOption = { code: string; label: string };

export const DISCOVERY_OPTIONS_HAIR: readonly DiscoveryCategoryOption[] = [
  { code: "haircut", label: "Haircut" },
  { code: "colour", label: "Colour" },
  { code: "highlights_balayage", label: "Highlights/Balayage" },
  { code: "blowout_styling", label: "Blowout & styling" },
  { code: "hair_treatments", label: "Hair treatments" },
  { code: "bridal_hair", label: "Bridal hair" },
  { code: "makeup_hair_lane", label: "Makeup" },
];

/** Brow services shown as primary rows on New visit; profile Get discovered lists all brows options as chips. */
export const DISCOVERY_BROWS_BEFORE_OTHER: readonly DiscoveryCategoryOption[] = [
  { code: "brow_shaping_waxing", label: "Brow shaping & waxing" },
  { code: "brow_lamination", label: "Brow lamination" },
  { code: "brow_tinting", label: "Brow tinting" },
];

/** Brows & lashes: “Other” on New visit (modal); also chips on Get discovered. */
export const DISCOVERY_BROWS_IN_OTHER_DROPDOWN: readonly DiscoveryCategoryOption[] =
  [
    { code: "lash_tinting", label: "Lash tinting" },
    { code: "lash_lift", label: "Lash lift" },
    { code: "lash_extensions", label: "Lash Extensions" },
    { code: "makeup_brows_lane", label: "Makeup" },
  ];

/** All brows & lashes discovery codes (profile + visits share this set). */
export const DISCOVERY_OPTIONS_BROWS: readonly DiscoveryCategoryOption[] = [
  ...DISCOVERY_BROWS_BEFORE_OTHER,
  ...DISCOVERY_BROWS_IN_OTHER_DROPDOWN,
];

/** Primary service rows on New visit (hair / esthetician): first three discovery options. */
export const VISIT_HAIR_PRIMARY_COUNT = 3;

export const DISCOVERY_OPTIONS_NAILS: readonly DiscoveryCategoryOption[] = [
  { code: "manicure", label: "Manicure" },
  { code: "pedicure", label: "Pedicure" },
  { code: "gel_acrylic", label: "Gel & acrylic" },
  { code: "nail_art", label: "Nail art" },
];

/**
 * Barber lane — separate from hair (no shared specialties, no shared visit
 * services, lane-isolated on the backend via `profession_id`).
 */
export const DISCOVERY_OPTIONS_BARBER: readonly DiscoveryCategoryOption[] = [
  { code: "haircut", label: "Haircut" },
  { code: "beard_trim", label: "Beard trim" },
  { code: "beard_shaping", label: "Beard shaping" },
  { code: "hot_towel_shave", label: "Hot towel shave" },
  { code: "hair_design_lineup", label: "Hair design/lineup" },
  { code: "kids_haircut", label: "Kids haircut" },
];

/** Section title shown above category chips on Get discovered. */
export const DISCOVERY_SECTION_TITLE: Partial<
  Record<ProfessionChoiceCode, string>
> = {
  hair: "Hair",
  brows_lashes: "Brows",
  nails: "Nails",
  barber: "Barber",
};

const LEGACY_LASH_LIFT_TINT = "lash_lift_tint";

/** Expands retired API codes after parse so UI and saves use current tags. */
export function expandLegacyDiscoveryCategories(
  codes: readonly string[]
): string[] {
  const set = new Set(codes.filter(Boolean));
  if (set.delete(LEGACY_LASH_LIFT_TINT)) {
    set.add("lash_tinting");
    set.add("lash_lift");
  }
  return [...set].sort();
}

/** Drops stale codes removed from the lane (they no longer validate on the backend). */
export function sanitizeDiscoveryCategoriesForProfession(
  codes: readonly string[],
  profession: ProfessionChoiceCode | null
): string[] {
  if (profession == null) return [...codes].filter(Boolean).sort();
  const allowed = new Set(
    discoveryOptionsForProfession(profession).map((o) => o.code.toLowerCase())
  );
  return codes
    .filter((c) => typeof c === "string" && allowed.has(c.trim().toLowerCase()))
    .map((c) => c.trim().toLowerCase())
    .sort();
}

export function discoveryOptionsForProfession(
  code: ProfessionChoiceCode | null
): readonly DiscoveryCategoryOption[] {
  switch (code) {
    case "hair":
      return DISCOVERY_OPTIONS_HAIR;
    case "brows_lashes":
      return DISCOVERY_OPTIONS_BROWS;
    case "nails":
      return DISCOVERY_OPTIONS_NAILS;
    case "barber":
      return DISCOVERY_OPTIONS_BARBER;
    default:
      return [];
  }
}

/** New visit: full-width rows vs “Other” modal multi-select (labels match discovery). */
export function visitServiceLayoutForProfession(
  code: ProfessionChoiceCode | null
): {
  primary: readonly DiscoveryCategoryOption[];
  dropdown: readonly DiscoveryCategoryOption[];
} {
  switch (code) {
    case "hair":
    case "esthetician":
      return {
        primary: DISCOVERY_OPTIONS_HAIR.slice(0, VISIT_HAIR_PRIMARY_COUNT),
        dropdown: DISCOVERY_OPTIONS_HAIR.slice(VISIT_HAIR_PRIMARY_COUNT),
      };
    case "brows_lashes":
      return {
        primary: [...DISCOVERY_BROWS_BEFORE_OTHER],
        dropdown: [...DISCOVERY_BROWS_IN_OTHER_DROPDOWN],
      };
    case "nails":
      return {
        primary: DISCOVERY_OPTIONS_NAILS,
        dropdown: [],
      };
    case "barber":
      return {
        primary: DISCOVERY_OPTIONS_BARBER.slice(0, VISIT_HAIR_PRIMARY_COUNT),
        dropdown: DISCOVERY_OPTIONS_BARBER.slice(VISIT_HAIR_PRIMARY_COUNT),
      };
    default:
      return { primary: [], dropdown: [] };
  }
}

export function allVisitServiceLabelsForProfession(
  code: ProfessionChoiceCode | null
): Set<string> {
  const { primary, dropdown } = visitServiceLayoutForProfession(code);
  return new Set([...primary, ...dropdown].map((o) => o.label));
}

/** Maps legacy visit `services` strings to current discovery labels. */
const LEGACY_VISIT_SERVICE_LABEL_ALIASES: Record<string, string> = {
  color: "Colour",
  "foiling technique": "Highlights/Balayage",
  "brow shaping": "Brow shaping & waxing",
  "manicure/pedicure": "Manicure",
  "nail enhancements": "Gel & acrylic",
  "nail art": "Nail art",
  "lash extensions": "Lash Extensions",
};

function resolveVisitServiceLabel(
  trimmed: string,
  valid: Set<string>
): string | null {
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "other") return null;
  if (valid.has(trimmed)) return trimmed;
  const mapped = LEGACY_VISIT_SERVICE_LABEL_ALIASES[trimmed.toLowerCase()];
  if (mapped && valid.has(mapped)) return mapped;
  return null;
}

/** Normalizes stored visit service labels when opening New visit / Edit visit. */
export function canonicalizeVisitServicesFromStrings(
  rawLabels: readonly string[],
  profession: ProfessionChoiceCode | null
): string[] {
  const valid = allVisitServiceLabelsForProfession(profession);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawLabels) {
    const resolved = resolveVisitServiceLabel(raw.trim(), valid);
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
      out.push(resolved);
    }
  }
  return out;
}

/** Parse `/me` payload then normalize legacy discovery codes for this app version. */
export function normalizeDiscoveryCategoriesFromApi(
  raw: string[] | unknown | null | undefined
): string[] {
  return expandLegacyDiscoveryCategories(parseDiscoveryCategories(raw));
}

/** Parse `/me` payload: Prisma Json may deserialize as unknown[]. */
export function parseDiscoveryCategories(
  raw: string[] | unknown | null | undefined
): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) {
      out.add(x.trim().toLowerCase());
    }
  }
  return [...out].sort();
}
