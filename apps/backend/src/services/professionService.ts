import { prisma } from "../lib/prisma";
import { pickDefaultProfessionRow } from "../lib/professionBusinessHelpers";

/** Default profession code for hair (backward compatibility) */
const DEFAULT_PROFESSION_CODE = "hair";

let cachedHairProfessionId: string | null = null;

/** Map common aliases / typos to `professions.code` values. */
export function normalizeProfessionCodeInput(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (t === "nail" || t === "nail_technician" || t === "nailtech") return "nails";
  if (t === "hairdresser" || t === "hair_dresser") return "hair";
  if (t === "brow" || t === "lashes" || t === "brow_stylist") return "brows_lashes";
  if (t === "consumer" || t === "personal") return "client";
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

  /**
   * Code to use for legacy / default salon+bio updates when `profession_code` is omitted
   * (prefers `hair`, else lowest `sort_order`).
   */
  async getDefaultProfessionCodeForProfessionalProfile(
    professionalProfileId: string
  ): Promise<string | null> {
    const rows = await prisma.professionalProfession.findMany({
      where: { professionalProfileId },
      include: { profession: { select: { code: true, sortOrder: true } } },
    });
    const picked = pickDefaultProfessionRow(rows);
    return picked?.profession?.code ?? null;
  },

  /**
   * Which `professional_professions` row to use for lane-isolated APIs (visits, client links).
   * Single-role accounts: always that row (optional request code).
   * Multi-role: requires `professionCodeFromRequest` matching an active row; otherwise `null`
   * — callers must return empty data, never merge links across professions.
   */
  async resolveActiveProfessionScopeForProfessionalProfile(
    professionalProfileId: string,
    professionCodeFromRequest: string | undefined | null
  ): Promise<{ professionId: string; normalizedCode: string } | null> {
    const rows = await prisma.professionalProfession.findMany({
      where: { professionalProfileId, isActive: { not: false } },
      include: { profession: { select: { code: true } } },
      orderBy: { createdAt: "asc" },
    });
    /** No rows yet (sync lag / legacy DB): scope by requested code so visits & links still work. */
    if (rows.length === 0) {
      const raw = professionCodeFromRequest?.trim();
      if (!raw) return null;
      try {
        const professionId = await this.getProfessionIdByCode(raw);
        return {
          professionId,
          normalizedCode: normalizeProfessionCodeInput(raw),
        };
      } catch {
        return null;
      }
    }
    if (rows.length === 1) {
      const r = rows[0];
      return { professionId: r.professionId, normalizedCode: r.profession.code };
    }
    const raw = professionCodeFromRequest?.trim();
    if (!raw) return null;
    const normalized = normalizeProfessionCodeInput(raw);
    const match = rows.find((r) => r.profession.code === normalized);
    if (!match) return null;
    return { professionId: match.professionId, normalizedCode: match.profession.code };
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
