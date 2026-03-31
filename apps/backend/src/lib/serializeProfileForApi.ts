import type { Profile } from "@prisma/client";
import { profileDisplayName } from "./profileDisplay";

export type ProfileWithProfessional = Profile & {
  professionalProfile?: { id: string } | null;
};

/** Snake_case JSON for mobile `Profile` + derived `user_type`. */
export function serializeProfileForApi(profile: ProfileWithProfessional) {
  return {
    id: profile.id,
    email: profile.email ?? null,
    created_at: profile.createdAt?.toISOString?.() ?? null,
    updated_at: profile.updatedAt?.toISOString?.() ?? null,
    first_name: profile.firstName ?? null,
    last_name: profile.lastName ?? null,
    username: profile.username ?? null,
    full_name: profileDisplayName(profile),
    country: profile.country ?? null,
    avatar_url: profile.avatarUrl ?? null,
    phone_number: profile.phoneNumber ?? null,
    /** Always a boolean so clients never treat `null` as ambiguous on reload. */
    setup_status: profile.setupStatus === true,
    signup_date: profile.signupDate?.toISOString?.() ?? null,
    user_type:
      profile.professionalProfile != null ? "HAIRDRESSER" : "CLIENT",
  };
}
