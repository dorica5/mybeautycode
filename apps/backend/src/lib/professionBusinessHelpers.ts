/**
 * Salon / bio / social live on `professional_professions` (per profession).
 * These helpers pick a default row for legacy flat API fields and serialize detail arrays.
 */

export type ProfessionJoinRow = {
  profession: { code: string; sortOrder: number } | null | undefined;
  businessName: string | null;
  businessNumber: string | null;
  businessAddress: string | null;
  aboutMe: string | null;
  socialMedia: string | null;
  bookingSite: string | null;
};

/** Prefer `hair`, else lowest `sort_order` (stable tie-break). */
export function pickDefaultProfessionRow<T extends ProfessionJoinRow>(
  rows: T[]
): T | null {
  if (!rows?.length) return null;
  const hair = rows.find((r) => r.profession?.code === "hair");
  if (hair) return hair;
  return [...rows].sort(
    (a, b) =>
      (a.profession?.sortOrder ?? 0) - (b.profession?.sortOrder ?? 0)
  )[0] ?? null;
}

export function professionsDetailSnakeCase(rows: ProfessionJoinRow[]) {
  return rows.map((r) => ({
    profession_code: r.profession?.code ?? null,
    business_name: r.businessName ?? null,
    business_number: r.businessNumber ?? null,
    business_address: r.businessAddress ?? null,
    about_me: r.aboutMe ?? null,
    social_media: r.socialMedia ?? null,
    booking_site: r.bookingSite ?? null,
  }));
}
