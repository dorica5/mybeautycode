import { prisma } from "../lib/prisma";

/** Default profession code for hair (backward compatibility) */
const DEFAULT_PROFESSION_CODE = "hair";

let cachedHairProfessionId: string | null = null;

export const professionService = {
  /** Get profession ID by code (e.g. "hair"). Caches result. */
  async getProfessionIdByCode(code: string = DEFAULT_PROFESSION_CODE): Promise<string> {
    if (code === DEFAULT_PROFESSION_CODE && cachedHairProfessionId) {
      return cachedHairProfessionId;
    }
    const profession = await prisma.profession.findUnique({
      where: { code },
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
    if (code === DEFAULT_PROFESSION_CODE) {
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
