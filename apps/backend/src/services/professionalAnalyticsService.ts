import { prisma } from "../lib/prisma";
import { normalizeProfessionCodeInput } from "./professionService";

export type ProfessionalAnalyticsEvent =
  | "profile_view"
  | "booking_click"
  | "social_click";

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
  }): Promise<{ recorded: boolean }> {
    const { subjectProfileId, viewerProfileId, professionCode, event } = params;
    if (subjectProfileId === viewerProfileId) {
      return { recorded: false };
    }

    const row = await findActiveProfessionRow(subjectProfileId, professionCode);
    if (!row) {
      return { recorded: false };
    }

    const data =
      event === "profile_view"
        ? { profileViewCount: { increment: 1 } }
        : event === "booking_click"
          ? { bookingClickCount: { increment: 1 } }
          : { socialClickCount: { increment: 1 } };

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
      },
    });
    if (!full) return null;
    return {
      profileViewCount: full.profileViewCount,
      bookingClickCount: full.bookingClickCount,
      socialClickCount: full.socialClickCount,
    };
  },
};
