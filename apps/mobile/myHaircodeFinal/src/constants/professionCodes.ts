export const PROFESSION_CHOICE_CODES = [
  "hair",
  "brows_lashes",
  "nails",
  "esthetician",
] as const;

export type ProfessionChoiceCode = (typeof PROFESSION_CHOICE_CODES)[number];

/** First line of the H3 on professional setup; second line is always "account". */
export const PROFESSION_HEADLINE_ROLE: Record<ProfessionChoiceCode, string> = {
  hair: "Hairdresser",
  brows_lashes: "Brow stylist",
  nails: "Nail technician",
  esthetician: "Esthetician",
};

/** Service pills on “new visit” for hairdresser accounts (and esthetician until tailored). */
export const HAIR_VISIT_SERVICE_OPTIONS = [
  "Haircut",
  "Color",
  "Foiling technique",
  "Other",
] as const;

/** Service pills on “new visit” for brow stylist accounts. */
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
  { code: "brows_lashes", label: "I'm a brow stylist" },
  { code: "nails", label: "I'm a nail technician" },
];

/** Subtitle under “My visits” — matches linked `professional_professions` / `profession_codes`. */
const PROFESSION_HOME_ACCOUNT_LABEL: Record<ProfessionChoiceCode, string> = {
  hair: "Hairdresser account",
  brows_lashes: "Brow stylist account",
  nails: "Nail technician account",
  esthetician: "Esthetician account",
};

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
export type InspirationFilterTab = "hair" | "nails" | "brows";

export function inspirationFilterTabToProfessionCode(
  tab: InspirationFilterTab
): string {
  if (tab === "brows") return "brows_lashes";
  return tab;
}

/** Consumer “My inspiration” bucket (distinct from pro hair/nails/brows for the same profile id). */
export const CLIENT_INSPIRATION_PROFESSION_CODE = "client";

/** Map active professional role to My Inspiration filter tabs. */
export function professionChoiceCodeToInspirationTab(
  code: ProfessionChoiceCode | null
): InspirationFilterTab {
  if (code === "nails") return "nails";
  if (code === "brows_lashes") return "brows";
  return "hair";
}

/** True when the logged-in user can use the professional (hairdresser) app surface. */
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
  if (activeCode) return PROFESSION_HOME_ACCOUNT_LABEL[activeCode];
  const coerced = coerceProfessionCode(fallbackRawCode ?? undefined);
  if (coerced) return PROFESSION_HOME_ACCOUNT_LABEL[coerced];
  return "Professional account";
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
