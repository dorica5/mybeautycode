export const PROFESSION_CHOICE_CODES = [
  "hair",
  "brows_lashes",
  "nails",
  "esthetician",
  "barber",
] as const;

export type ProfessionChoiceCode = (typeof PROFESSION_CHOICE_CODES)[number];

/** First line of the H3 on professional setup; second line is always "account". */
export const PROFESSION_HEADLINE_ROLE: Record<ProfessionChoiceCode, string> = {
  hair: "Hairdresser",
  brows_lashes: "Brow stylist",
  nails: "Nail technician",
  esthetician: "Esthetician",
  barber: "Barber",
};

/** @deprecated Visit services are defined in `profDiscoveryCategories` (`visitServiceLayoutForProfession`). Kept for reference only. */
export const HAIR_VISIT_SERVICE_OPTIONS = [
  "Haircut",
  "Color",
  "Foiling technique",
  "Other",
] as const;

/** @deprecated See `profDiscoveryCategories.visitServiceLayoutForProfession`. */
export const BROW_VISIT_SERVICE_OPTIONS = [
  "Brow shaping",
  "Brow tinting",
  "Lash lift",
  "Other",
] as const;

/**
 * Onboarding / “choose profession” UI only. Esthetician stays in {@link PROFESSION_CHOICE_CODES}
 * for API + legacy rows until the product ships that path.
 */
export const CHOOSE_PROFESSION_OPTIONS: {
  code: ProfessionChoiceCode;
  label: string;
}[] = [
  { code: "hair", label: "I'm a hairdresser" },
  { code: "barber", label: "I'm a barber" },
  { code: "brows_lashes", label: "I'm a brow stylist" },
  { code: "nails", label: "I'm a nail technician" },
];

/** Subtitle under “My visits” — matches linked `professional_professions` / `profession_codes`. */
export const PROFESSION_ACCOUNT_LABEL: Record<ProfessionChoiceCode, string> = {
  hair: "Hairdresser account",
  brows_lashes: "Brow stylist account",
  nails: "Nail technician account",
  esthetician: "Esthetician account",
  barber: "Barber account",
};

/**
 * What a professional's place of business is called in UI copy.
 *
 * Barbers call it a "barbershop", not a "salon" — and many actively dislike the
 * latter. Every other lane keeps "Salon". DB columns (`business_name`,
 * `salon_name`, `business_address`, …) are unchanged; this only affects what
 * users read in onboarding, profile settings, and the public profile.
 */
export function establishmentNoun(
  code: ProfessionChoiceCode | null | undefined,
  variant: "title" | "lower" = "title"
): string {
  const title = code === "barber" ? "Barbershop" : "Salon";
  return variant === "lower" ? title.toLowerCase() : title;
}

function isProfessionCode(c: string): c is ProfessionChoiceCode {
  return (PROFESSION_CHOICE_CODES as readonly string[]).includes(c);
}

/**
 * Map API / storage strings to a known profession code (handles casing, labels, stale keys).
 */
export function coerceProfessionCode(
  raw: string | null | undefined
): ProfessionChoiceCode | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!s) return null;
  if (isProfessionCode(s)) return s;
  const lower = s.toLowerCase();
  if (isProfessionCode(lower)) return lower;
  const underscored = lower.replace(/\s+/g, "_");
  if (isProfessionCode(underscored)) return underscored;
  if (lower === "hairdresser" || underscored === "hair_dresser") return "hair";
  if (lower === "brows" || lower === "lashes") return "brows_lashes";
  if (
    lower === "nail" ||
    underscored === "nail_technician" ||
    underscored === "nailtech"
  ) {
    return "nails";
  }
  /** Ignore useless placeholders so callers can fall through to real data. */
  if (
    underscored === "professional" ||
    underscored === "professional_account"
  ) {
    return null;
  }
  return null;
}

/** Professions the user has not linked yet (for “Add account” / add-profession flow). */
export function professionOptionsNotYetLinked(
  professionCodesFromProfile: string[] | null | undefined,
): typeof CHOOSE_PROFESSION_OPTIONS {
  const have = new Set<ProfessionChoiceCode>();
  for (const c of professionCodesFromProfile ?? []) {
    const n = coerceProfessionCode(c);
    if (n) have.add(n);
  }
  return CHOOSE_PROFESSION_OPTIONS.filter((opt) => !have.has(opt.code));
}

/** Pick which profession to show: last visited if still linked, else first in API order. */
export function pickActiveProfessionCode(
  codes: string[] | null | undefined,
  lastVisited: string | null | undefined
): ProfessionChoiceCode | null {
  const list = codes ?? [];
  const normalizedList: ProfessionChoiceCode[] = [];
  for (const c of list) {
    const n = coerceProfessionCode(c);
    if (n && !normalizedList.includes(n)) normalizedList.push(n);
  }
  const stored = coerceProfessionCode(lastVisited ?? undefined);
  if (stored && (normalizedList.length === 0 || normalizedList.includes(stored))) {
    return stored;
  }
  if (normalizedList.length > 0) return normalizedList[0];
  return null;
}

/** Subtitle for professional home from `profession_codes` / last-visited code. */
/** My Inspiration filter chips — maps to `professions.code` for `/api/inspirations`. */
export type InspirationFilterTab = "hair" | "nails" | "brows" | "barber";

export function inspirationFilterTabToProfessionCode(
  tab: InspirationFilterTab
): string {
  if (tab === "brows") return "brows_lashes";
  return tab;
}

/** Consumer “My inspiration” bucket (distinct from pro hair/nails/brows for the same profile id). */
export const CLIENT_INSPIRATION_PROFESSION_CODE = "client";

/**
 * Map active professional role to My Inspiration filter tabs.
 *
 * Barber maps to its own tab (NOT hair) so a barber-only account never sees a
 * hairdresser's inspirations — `/api/inspirations` is scoped by `profession_id`.
 */
export function professionChoiceCodeToInspirationTab(
  code: ProfessionChoiceCode | null
): InspirationFilterTab {
  if (code === "nails") return "nails";
  if (code === "brows_lashes") return "brows";
  if (code === "barber") return "barber";
  return "hair";
}

/** True when the logged-in user can use the professional (professional) app surface. */
export function profileHasProfessionalCapability(
  profile:
    | {
        professional_profile_id?: string | null;
        profession_codes?: string[] | null | undefined;
      }
    | null
    | undefined
): boolean {
  if (!profile) return false;
  return (
    Boolean(profile.professional_profile_id) ||
    (profile.profession_codes?.length ?? 0) > 0
  );
}

/**
 * Visit price is visible only when the viewer is a professional on the same
 * profession lane as the visit (not clients, not another lane on the same login).
 */
export function canViewerSeeVisitPriceForLane(args: {
  visitProfessionCode: ProfessionChoiceCode | null;
  viewerActiveProfessionCode: ProfessionChoiceCode | null;
  viewerIsProfessional: boolean;
}): boolean {
  if (!args.viewerIsProfessional) return false;
  if (!args.visitProfessionCode || !args.viewerActiveProfessionCode) {
    return false;
  }
  return args.visitProfessionCode === args.viewerActiveProfessionCode;
}

/** Hair-only profile fields (e.g. color brand on `professional_hair_profiles`). */
export function profileHasHairProfession(
  profile: {
    profession_codes?: string[] | null | undefined;
  } | null
  | undefined
): boolean {
  for (const c of profile?.profession_codes ?? []) {
    if (coerceProfessionCode(c) === "hair") return true;
  }
  return false;
}

export function professionHomeAccountLabel(
  activeCode: ProfessionChoiceCode | null,
  fallbackRawCode?: string | null
): string {
  if (activeCode) return PROFESSION_ACCOUNT_LABEL[activeCode];
  const coerced = coerceProfessionCode(fallbackRawCode ?? undefined);
  if (coerced) return PROFESSION_ACCOUNT_LABEL[coerced];
  return "Professional account";
}

/**
 * Push / in-app copy when a client adds this professional in a given lane.
 */
export function clientAddedProfessionalMessage(
  clientFullName: string | null | undefined,
  professionalLane: ProfessionChoiceCode | null | undefined
): string {
  const name = clientFullName?.trim() || "A client";
  switch (professionalLane) {
    case "nails":
      return `${name} has added you as their nail technician.`;
    case "brows_lashes":
      return `${name} has added you as their brow stylist.`;
    case "hair":
      return `${name} has added you as their hairdresser.`;
    case "esthetician":
      return `${name} has added you as their esthetician.`;
    case "barber":
      return `${name} has added you as their barber.`;
    default:
      return `${name} has added you as their professional.`;
  }
}

/**
 * Profession for visit detail / preview labels. Uses `service_records.profession_id`
 * when accurate; corrects legacy rows that always used `hair` when the creator has a
 * single non-hair profession; otherwise falls back to their linked profession codes.
 */
export function professionCodeForServiceRecord(
  recordProfessionCode: string | null | undefined,
  creatorProfessionCodes: string[] | null | undefined
): ProfessionChoiceCode {
  const fromRecord = coerceProfessionCode(recordProfessionCode);
  const normalized: ProfessionChoiceCode[] = [];
  for (const c of creatorProfessionCodes ?? []) {
    const n = coerceProfessionCode(c);
    if (n && !normalized.includes(n)) normalized.push(n);
  }

  if (fromRecord) {
    if (
      fromRecord === "hair" &&
      normalized.length === 1 &&
      normalized[0] !== "hair"
    ) {
      return normalized[0];
    }
    return fromRecord;
  }
  return pickActiveProfessionCode(normalized, undefined) ?? "hair";
}

/** Visit screens: merge API `getWithMedia` profession + profile includes + profile fallback. */
export function professionCodeForVisitRecord(
  record:
    | {
        profession?: { code?: string };
        professionalProfile?: {
          professionalProfessions?: { profession?: { code?: string } }[];
        };
      }
    | null
    | undefined,
  profileOrFetchedProfessionCodes: string[] | null | undefined
): ProfessionChoiceCode {
  const rows = record?.professionalProfile?.professionalProfessions;
  let fromInclude: string[] | undefined;
  if (rows?.length) {
    const codes = rows
      .map((r) => r.profession?.code)
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0);
    if (codes.length) fromInclude = codes;
  }
  const creatorCodes = fromInclude?.length
    ? fromInclude
    : profileOrFetchedProfessionCodes;
  const raw = record?.profession?.code;
  return professionCodeForServiceRecord(
    typeof raw === "string" ? raw : null,
    creatorCodes
  );
}
