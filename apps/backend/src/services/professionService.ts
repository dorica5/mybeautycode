import { prisma } from "../lib/prisma";

/** Default profession code for hair (backward compatibility) */
const DEFAULT_PROFESSION_CODE = "hair";

let cachedHairProfessionId: string | null = null;

/** Map common aliases / typos to `professions.code` values. */
export function normalizeProfessionCodeInput(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (t === "nail" || t === "nail_technician" || t === "nailtech") return "nails";
  if (t === "hairdresser" || t === "hair_dresser") return "hair";
  if (t === "brow" || t === "lashes" || t === "brow_stylist") return "brows_lashes";
  return t;
}

export const professionService = {
  /** Get profession ID by code (e.g. "hair"). Caches result. */
  async getProfessionIdByCode(code: string = DEFAULT_PROFESSION_CODE): Promise<string> {
    const normalized = normalizeProfessionCodeInput(code);
    if (normalized === DEFAULT_PROFESSION_CODE && cachedHairProfessionId) {
      return cachedHairProfessionId;
    }
    const profession = await prisma.profession.findUnique({
      where: { code: normalized },
      select: { id: true },
    });
    if (!profession) {
      throw Object.assign(
        new Error(
          `Profession "${code}" not found. Seed the professions table (see prisma migrations) or pick another profession.`
        ),
        { statusCode: 400 as const }
      );
    }
    if (normalized === DEFAULT_PROFESSION_CODE) {
      cachedHairProfessionId = profession.id;
    }
    return profession.id;
  },

  /** Replace all profession links for a professional profile (e.g. after onboarding choice). */
  async replaceProfessionsForProfile(
    professionalProfileId: string,
    codes: string[],
  ): Promise<void> {
    if (codes.length === 0) return;
    const professionIds = await Promise.all(
      codes.map((code) => this.getProfessionIdByCode(code)),
    );
    await prisma.professionalProfession.deleteMany({
      where: { professionalProfileId },
    });
    await prisma.professionalProfession.createMany({
      data: professionIds.map((professionId) => ({
        professionalProfileId,
        professionId,
        isActive: true,
      })),
    });
  },

  /**
   * Links each profession code to the profile if not already linked.
   * Use when completing professional setup (or adding a profession) so existing rows are not removed.
   */
  async ensureProfessionsForProfile(
    professionalProfileId: string,
    codes: string[],
  ): Promise<void> {
    if (codes.length === 0) return;
    const professionIds = await Promise.all(
      codes.map((code) => this.getProfessionIdByCode(code)),
    );
    const existing = await prisma.professionalProfession.findMany({
      where: {
        professionalProfileId,
        professionId: { in: professionIds },
      },
      select: { professionId: true },
    });
    const have = new Set(existing.map((e) => e.professionId));
    const missing = professionIds.filter((id) => !have.has(id));
    if (missing.length === 0) return;
    await prisma.professionalProfession.createMany({
      data: missing.map((professionId) => ({
        professionalProfileId,
        professionId,
        isActive: true,
      })),
    });
  },

  /** Get or create professional profile for a profile ID. Returns professionalProfileId. */
  async getOrCreateProfessionalProfileId(profileId: string): Promise<string> {
    let prof = await prisma.professionalProfile.findUnique({
      where: { profileId },
      select: { id: true },
    });
    if (!prof) {
      prof = await prisma.professionalProfile.create({
        data: { profileId },
        select: { id: true },
      });
      /** Professions are added when onboarding completes (see profileService.update + profession_code). */
    }
    return prof.id;
  },
};
