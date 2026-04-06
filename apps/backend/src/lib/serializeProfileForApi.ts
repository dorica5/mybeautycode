import type { Profile } from "@prisma/client";
import { profileDisplayName } from "./profileDisplay";

/** Fields loaded for API responses (`/me`, PUT profile). */
export const professionalProfileApiSelect = {
  id: true,
  businessName: true,
  businessNumber: true,
  aboutMe: true,
  socialMedia: true,
  bookingSite: true,
} as const;

export type ProfessionalProfileApiSlice = {
  id: string;
  businessName: string | null;
  businessNumber: string | null;
  aboutMe: string | null;
  socialMedia: string | null;
  bookingSite: string | null;
};

export type ProfileWithProfessional = Profile & {
  professionalProfile?: ProfessionalProfileApiSlice | { id: string } | null;
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

/** Snake_case JSON for mobile `Profile` + derived `user_type`. */
export function serializeProfileForApi(profile: ProfileWithProfessional) {
  const prof = profile.professionalProfile;
  const profRow = prof && "businessName" in prof ? prof : null;
  return {
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
    /** From `professional_profiles` (mobile field names). */
    salon_name: profRow?.businessName ?? null,
    salon_phone_number: profRow?.businessNumber ?? null,
    about_me: profRow?.aboutMe ?? null,
    social_media: profRow?.socialMedia ?? null,
    booking_site: profRow?.bookingSite ?? null,
    /** Not stored in DB yet; mobile still expects the key. */
    color_brand: null,
  };
}
