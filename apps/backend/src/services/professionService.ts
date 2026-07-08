import { prisma } from "../lib/prisma";
import { pickDefaultProfessionRow } from "../lib/professionBusinessHelpers";
import { profileDisplayName } from "../lib/profileDisplay";
import { normalizeProfessionCodeInput } from "../lib/normalizeProfessionCode";

export { normalizeProfessionCodeInput } from "../lib/normalizeProfessionCode";

/** Default profession code for hair (backward compatibility) */
const DEFAULT_PROFESSION_CODE = "hair";

/** In-memory cache for `professions.id` by normalized code (speeds map salon sheet, etc.). */
const professionIdByNormalizedCode = new Map<string, string>();

export const professionService = {
  /** Get profession ID by code (e.g. "hair"). Caches result. */
  async getProfessionIdByCode(code: string = DEFAULT_PROFESSION_CODE): Promise<string> {
    const normalized = normalizeProfessionCodeInput(code);
    const hit = professionIdByNormalizedCode.get(normalized);
    if (hit) return hit;
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
    professionIdByNormalizedCode.set(normalized, profession.id);
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
    options?: { seedFromProfileId?: string }
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

    let seedFirst: string | null = null;
    let seedLast: string | null = null;
    let seedDisplay: string | null = null;
    const profileId = options?.seedFromProfileId?.trim();
    if (profileId) {
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { firstName: true, lastName: true },
      });
      seedFirst = profile?.firstName?.trim() || null;
      seedLast = profile?.lastName?.trim() || null;
      seedDisplay = profileDisplayName({
        firstName: seedFirst,
        lastName: seedLast,
      });
    }

    await prisma.professionalProfession.createMany({
      data: missing.map((professionId) => ({
        professionalProfileId,
        professionId,
        isActive: true,
        ...(seedFirst || seedLast || seedDisplay
          ? {
              firstName: seedFirst,
              lastName: seedLast,
              ...(seedDisplay ? { displayName: seedDisplay } : {}),
            }
          : {}),
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
   * When the client sends a lane code, we **materialize** a missing `professional_professions` row
   * (`ensureProfessionsForProfile`) so “hair” vs “nails” never silently resolves to the wrong DB row.
   */
  async resolveActiveProfessionScopeForProfessionalProfile(
    professionalProfileId: string,
    professionCodeFromRequest: string | undefined | null
  ): Promise<{ professionId: string; normalizedCode: string } | null> {
    const raw = professionCodeFromRequest?.trim();

    if (raw) {
      try {
        const canonical = normalizeProfessionCodeInput(raw);
        const profRow = await prisma.professionalProfile.findUnique({
          where: { id: professionalProfileId },
          select: { profileId: true },
        });
        await this.ensureProfessionsForProfile(
          professionalProfileId,
          [canonical],
          { seedFromProfileId: profRow?.profileId }
        );
      } catch {
        /** Invalid / unknown profession code — do not create rows. */
      }
    }

    const rows = await prisma.professionalProfession.findMany({
      where: { professionalProfileId, isActive: { not: false } },
      include: { profession: { select: { code: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (rows.length === 0) {
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

    if (raw) {
      const normalized = normalizeProfessionCodeInput(raw);
      const match = rows.find(
        (r) => normalizeProfessionCodeInput(r.profession.code) === normalized
      );
      if (!match) return null;
      return {
        professionId: match.professionId,
        normalizedCode: match.profession.code,
      };
    }

    /** No lane in request: single active row only (legacy clients / internal callers). */
    if (rows.length === 1) {
      const r = rows[0];
      return { professionId: r.professionId, normalizedCode: r.profession.code };
    }
    return null;
  },

  /** Get or create professional profile for a profile ID. Returns professionalProfileId. */
  async getOrCreateProfessionalProfileId(profileId: string): Promise<string> {
    let prof = await prisma.professionalProfile.findUnique({
      where: { profileId },
      select: { id: true },
    });
    if (!prof) {
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { firstName: true, lastName: true },
      });
      const firstName = profile?.firstName?.trim() || null;
      const lastName = profile?.lastName?.trim() || null;
      const displayName = profileDisplayName({ firstName, lastName });
      prof = await prisma.professionalProfile.create({
        data: {
          profileId,
          firstName,
          lastName,
          ...(displayName ? { displayName } : {}),
        },
        select: { id: true },
      });
      /** Professions are added when onboarding completes (see profileService.update + profession_code). */
    }
    return prof.id;
  },
};
