import type { Profile } from "@/src/constants/types";
import {
  coerceProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { resolveLaneAboutMe } from "@/src/lib/clientAboutMe";
import { resolveProfessionalFullName } from "@/src/lib/professionalDisplayName";

/** Client-visible pro profile fields scoped to one profession lane (no hair fallback). */
export function buildPublicProfessionalProfileFields(
  profile: Profile,
  displayLane: ProfessionChoiceCode | null
) {
  const scoped =
    displayLane && profile.professions_detail?.length
      ? (profile.professions_detail.find(
          (row) =>
            coerceProfessionCode(row.profession_code ?? undefined) ===
            displayLane
        ) ?? null)
      : null;

  const laneScoped = displayLane != null;

  return {
    full_name:
      resolveProfessionalFullName(profile, displayLane) ??
      (laneScoped ? null : profile.full_name),
    first_name: profile.first_name,
    username: profile.username,
    about_me: laneScoped
      ? resolveLaneAboutMe(scoped?.about_me) || null
      : profile.about_me ?? null,
    salon_name: laneScoped
      ? scoped?.business_name?.trim() || null
      : profile.salon_name ?? null,
    business_address: laneScoped
      ? scoped?.business_address?.trim() || null
      : profile.business_address ?? null,
    salon_phone_number: laneScoped
      ? scoped?.business_number?.trim() || null
      : profile.salon_phone_number ?? null,
    booking_site: laneScoped
      ? scoped?.booking_site?.trim() || null
      : profile.booking_site ?? null,
    social_media: laneScoped
      ? scoped?.social_media?.trim() || null
      : profile.social_media ?? null,
    color_brand: displayLane === "hair" ? profile.color_brand : null,
    profession_codes: profile.profession_codes,
  };
}
