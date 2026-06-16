import type { Profile, ProfessionDetailApi } from "@/src/constants/types";
import { coerceProfessionCode } from "@/src/constants/professionCodes";

type AvatarProfile = Pick<Profile, "avatar_url" | "professions_detail">;

/**
 * Client surface → base profile photo.
 * Pro surface → lane override when set, else base profile photo.
 */
export function resolveAvatarStoragePath(
  profile: AvatarProfile | null | undefined,
  professionCode: string | null | undefined
): string | null {
  if (!profile) return null;
  const base = profile.avatar_url?.trim() || null;
  const code = professionCode
    ? coerceProfessionCode(professionCode)
    : null;
  if (!code) return base;

  const detail = profile.professions_detail?.find(
    (row: ProfessionDetailApi) =>
      coerceProfessionCode(row.profession_code ?? undefined) === code
  );
  const lane = detail?.avatar_url?.trim();
  return lane || base;
}

/** Lane-only override (null = using client photo). */
export function professionLaneAvatarPath(
  profile: AvatarProfile | null | undefined,
  professionCode: string | null | undefined
): string | null {
  if (!profile || !professionCode) return null;
  const code = coerceProfessionCode(professionCode);
  if (!code) return null;
  const detail = profile.professions_detail?.find(
    (row: ProfessionDetailApi) =>
      coerceProfessionCode(row.profession_code ?? undefined) === code
  );
  return detail?.avatar_url?.trim() || null;
}
