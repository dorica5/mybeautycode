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
      throw new Error(`Profession "${code}" not found. Run professions seed.`);
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
      const hairProfessionId = await this.getProfessionIdByCode();
      await prisma.professionalProfession.create({
        data: {
          professionalProfileId: prof.id,
          professionId: hairProfessionId,
          isActive: true,
        },
      });
    }
    return prof.id;
  },
};
