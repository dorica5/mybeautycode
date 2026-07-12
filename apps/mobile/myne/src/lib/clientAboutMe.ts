import type { Profile } from "@/src/constants/types";

function hasProfessionalProfile(
  profile: Pick<
    Profile,
    "profession_codes" | "user_type" | "professional_profile_id"
  >
): boolean {
  return (
    profile.user_type === "HAIRDRESSER" ||
    (profile.profession_codes?.length ?? 0) > 0 ||
    Boolean(profile.professional_profile_id)
  );
}

/** Client personal bio (`profiles.about_me`), not pro Get discovered superpower. */
export function resolveClientAboutMe(
  profile:
    | Pick<
        Profile,
        | "client_about_me"
        | "about_me"
        | "profession_codes"
        | "user_type"
        | "professional_profile_id"
      >
    | null
    | undefined
): string {
  if (!profile) return "";
  if (hasProfessionalProfile(profile)) {
    return profile.client_about_me?.trim() ?? "";
  }
  return (
    profile.client_about_me?.trim() ||
    profile.about_me?.trim() ||
    ""
  );
}

/** Pro Get discovered superpower for the active lane only — never the client bio. */
export function resolveLaneAboutMe(
  laneAboutMe: string | null | undefined
): string {
  return laneAboutMe?.trim() ?? "";
}
