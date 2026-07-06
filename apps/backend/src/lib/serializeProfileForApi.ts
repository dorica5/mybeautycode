import type { Profile, ProfessionalProfile } from "@prisma/client";
import { profileDisplayName, professionalProfileDisplayName } from "./profileDisplay";
import {
  pickDefaultProfessionRow,
  professionsDetailSnakeCase,
  type ProfessionJoinRow,
} from "./professionBusinessHelpers";
import {
  safeBookingSiteForRead,
  sanitizeSocialMediaForStorage,
} from "./safeExternalUrl";

type ProfessionalProfileWithProfessions = ProfessionalProfile & {
  professionalProfessions?: ProfessionJoinRow[];
  professionalHairProfile?: { colorBrand: string | null } | null;
};

export type ProfileWithProfessional = Profile & {
  professionalProfile?: ProfessionalProfileWithProfessions | null;
};

function professionCodesFromProfile(
  prof: ProfessionalProfileWithProfessions | null
): string[] {
  if (!prof?.professionalProfessions?.length) return [];
  return [...prof.professionalProfessions]
    .sort(
      (a, b) =>
        (a.profession?.sortOrder ?? 0) - (b.profession?.sortOrder ?? 0)
    )
    .map((row) => row.profession?.code)
    .filter((c): c is string => typeof c === "string" && c.length > 0);
}

/** True when Prisma include is missing usable codes (empty join or broken nested `profession`). */
export function needsProfessionCodesSqlFallback(
  prof: ProfessionalProfileWithProfessions | null | undefined
): boolean {
  return professionCodesFromProfile(prof ?? null).length === 0;
}

export type SerializeProfileOptions = {
  /** Filled when nested Prisma include returns no join rows but DB has links. */
  professionCodesSqlFallback?: string[];
  /**
   * Hair color brand is hairdresser-to-hairdresser only. When false, `color_brand`
   * is omitted from the payload even if the target has a hair profession.
   */
  exposeColorBrandToViewer?: boolean;
};

function toIsoString(value: Date | null | undefined): string | null {
  if (value == null) return null;
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  try {
    return value.toISOString();
  } catch {
    return null;
  }
}

/** Snake_case JSON for mobile `Profile` + derived `user_type` + professional business fields. */
export function serializeProfileForApi(
  profile: ProfileWithProfessional,
  options?: SerializeProfileOptions
) {
  const prof = profile.professionalProfile ?? null;
  const base: Record<string, unknown> = {
    id: profile.id,
    email: profile.email ?? null,
    created_at: toIsoString(profile.createdAt),
    updated_at: toIsoString(profile.updatedAt ?? undefined),
    first_name: profile.firstName ?? null,
    last_name: profile.lastName ?? null,
    username: profile.username ?? null,
    full_name: profileDisplayName(profile),
    country: profile.country ?? null,
    avatar_url: profile.avatarUrl ?? null,
    phone_number: profile.phoneNumber ?? null,
    /** Always a boolean so clients never treat `null` as ambiguous on reload. */
    setup_status: profile.setupStatus === true,
    signup_date: toIsoString(profile.signupDate ?? undefined),
    user_type: prof != null ? "HAIRDRESSER" : "CLIENT",
  };

  if (!prof) {
    return {
      ...base,
      professional_profile_id: null,
      profession_codes: [] as string[],
      display_name: null,
      pro_first_name: null,
      pro_last_name: null,
      professions_detail: [] as Record<string, unknown>[],
      business_name: null,
      business_number: null,
      business_address: null,
      about_me: profile.aboutMe ?? null,
      social_media: null,
      booking_site: null,
      salon_name: null,
      salon_phone_number: null,
    };
  }

  const fromNested = professionCodesFromProfile(prof);
  const profession_codes =
    fromNested.length > 0
      ? fromNested
      : (options?.professionCodesSqlFallback ?? []);

  const rows = prof.professionalProfessions ?? [];
  const defaultRow = pickDefaultProfessionRow(rows);
  const professions_detail = professionsDetailSnakeCase(rows);

  /** Public “salon color lines” — hairdresser viewers only when target lists `hair`. */
  const targetHasHairProfession = profession_codes.includes("hair");
  const exposeColorBrand = options?.exposeColorBrandToViewer !== false;
  const color_brand =
    targetHasHairProfession && exposeColorBrand
      ? (prof.professionalHairProfile?.colorBrand ?? null)
      : null;

  return {
    ...base,
    professional_profile_id: prof.id,
    profession_codes,
    pro_first_name: prof.firstName ?? null,
    pro_last_name: prof.lastName ?? null,
    display_name: professionalProfileDisplayName(prof),
    /** Per-profession salon / bio / social (use `profession_code` on PATCH to target a row). */
    professions_detail,
    business_name: defaultRow?.businessName ?? null,
    business_number: defaultRow?.businessNumber ?? null,
    business_address: defaultRow?.businessAddress ?? null,
    about_me: defaultRow?.aboutMe ?? null,
    social_media: sanitizeSocialMediaForStorage(defaultRow?.socialMedia),
    booking_site: safeBookingSiteForRead(defaultRow?.bookingSite),
    /** Legacy aliases — same values as default profession row (hair if present, else lowest sort_order). */
    salon_name: defaultRow?.businessName ?? null,
    salon_phone_number: defaultRow?.businessNumber ?? null,
    color_brand,
  };
}
