import { prisma } from "./prisma";

/**
 * Loads profession codes for a user’s professional profile via SQL joins.
 * Used when `include.professionalProfile.professionalProfessions` comes back empty
 * but rows exist in `professional_professions` (pooler/driver quirks, etc.).
 */
export async function fetchProfessionCodesForProfile(
  profileUserId: string
): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ code: string }>>`
    SELECT p.code AS code
    FROM professional_professions pp
    INNER JOIN professional_profiles pr ON pr.id = pp.professional_profile_id
    INNER JOIN professions p ON p.id = pp.profession_id
    WHERE pr.profile_id = ${profileUserId}::uuid
      AND (pp.is_active IS NULL OR pp.is_active = true)
    ORDER BY p.sort_order ASC
  `;
  return rows.map((r) => r.code).filter((c) => typeof c === "string" && c.length > 0);
}
