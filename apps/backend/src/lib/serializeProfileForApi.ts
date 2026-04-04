import type { Profile, ProfessionalProfile } from "@prisma/client";
import { profileDisplayName } from "./profileDisplay";

type ProfessionalProfileWithProfessions = ProfessionalProfile & {
  professionalProfessions?: {
    profession: { code: string; sortOrder: number };
  }[];
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
      business_name: null,
      business_number: null,
      business_address: null,
      about_me: null,
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

  return {
    ...base,
    professional_profile_id: prof.id,
    profession_codes,
    display_name: prof.displayName ?? null,
    business_name: prof.businessName ?? null,
    business_number: prof.businessNumber ?? null,
    business_address: prof.businessAddress ?? null,
    about_me: prof.aboutMe ?? null,
    social_media: prof.socialMedia ?? null,
    booking_site: prof.bookingSite ?? null,
    /** Legacy aliases from pre–professional_profiles naming */
    salon_name: prof.businessName ?? null,
    salon_phone_number: prof.businessNumber ?? null,
  };
}
