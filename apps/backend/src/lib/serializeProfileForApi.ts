import type { Profile } from "@prisma/client";
import { profileDisplayName } from "./profileDisplay";

export type ProfileWithProfessional = Profile & {
  professionalProfile?: { id: string } | null;
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
  };
}
