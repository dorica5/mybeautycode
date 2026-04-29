import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { normalizeProfessionCodeInput } from "./professionService";

export type ProfessionalAnalyticsEvent =
  | "profile_view"
  | "booking_click"
  | "social_click";

/** Keys aligned with mobile `SocialKind` / `inferSocialFromUrl`. */
const SOCIAL_CLICK_KEYS = new Set([
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
  "linkedin",
  "x",
  "pinterest",
  "snapchat",
  "threads",
  "other",
]);

function normalizeSocialClickKey(raw?: string | null): string {
  const t = (raw ?? "other").trim().toLowerCase();
  return SOCIAL_CLICK_KEYS.has(t) ? t : "other";
}

function parseSocialClickCounts(raw: unknown): Record<string, number> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(o)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out[k] = Math.trunc(n);
  }
  return out;
}

async function findActiveProfessionRow(
  subjectProfileId: string,
  professionCode?: string | null
) {
  if (professionCode && professionCode.trim()) {
    const code = normalizeProfessionCodeInput(professionCode);
    return prisma.professionalProfession.findFirst({
      where: {
        professionalProfile: { profileId: subjectProfileId },
        profession: { code },
        OR: [{ isActive: true }, { isActive: null }],
      },
      select: { id: true },
    });
  }
  return prisma.professionalProfession.findFirst({
    where: {
      professionalProfile: { profileId: subjectProfileId },
      OR: [{ isActive: true }, { isActive: null }],
    },
    orderBy: { profession: { sortOrder: "asc" } },
    select: { id: true },
  });
}

export const professionalAnalyticsService = {
  async recordEvent(params: {
    subjectProfileId: string;
    viewerProfileId: string;
    professionCode?: string | null;
    event: ProfessionalAnalyticsEvent;
    /** Present when event is social_click — SocialKind string from client URL inference. */
    socialPlatform?: string | null;
  }): Promise<{ recorded: boolean }> {
    const { subjectProfileId, viewerProfileId, professionCode, event } = params;
    if (subjectProfileId === viewerProfileId) {
      return { recorded: false };
    }

    const row = await findActiveProfessionRow(subjectProfileId, professionCode);
    if (!row) {
      return { recorded: false };
    }

    if (event === "social_click") {
      await prisma.$transaction(async (tx) => {
        const current = await tx.professionalProfession.findUnique({
          where: { id: row.id },
          select: { socialClickCounts: true },
        });
        const counts = parseSocialClickCounts(current?.socialClickCounts);
        const key = normalizeSocialClickKey(params.socialPlatform);
        counts[key] = (counts[key] ?? 0) + 1;
        await tx.professionalProfession.update({
          where: { id: row.id },
          data: {
            socialClickCount: { increment: 1 },
            socialClickCounts: counts as Prisma.InputJsonValue,
          },
        });
      });
      return { recorded: true };
    }

    const data =
      event === "profile_view"
        ? { profileViewCount: { increment: 1 } }
        : { bookingClickCount: { increment: 1 } };

    await prisma.professionalProfession.update({
      where: { id: row.id },
      data,
    });
    return { recorded: true };
  },

  async getStatsForProfileProfession(params: {
    ownerProfileId: string;
    professionCode?: string | null;
  }): Promise<{
    profileViewCount: number;
    bookingClickCount: number;
    socialClickCount: number;
    socialClickCounts: Record<string, number>;
  } | null> {
    const { ownerProfileId, professionCode } = params;
    const row = await findActiveProfessionRow(ownerProfileId, professionCode);
    if (!row) return null;
    const full = await prisma.professionalProfession.findUnique({
      where: { id: row.id },
      select: {
        profileViewCount: true,
        bookingClickCount: true,
        socialClickCount: true,
        socialClickCounts: true,
      },
    });
    if (!full) return null;
    return {
      profileViewCount: full.profileViewCount,
      bookingClickCount: full.bookingClickCount,
      socialClickCount: full.socialClickCount,
      socialClickCounts: parseSocialClickCounts(full.socialClickCounts),
    };
  },
};
