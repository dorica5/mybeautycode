import { prisma } from "../lib/prisma";

export const authService = {
  async getProfile(userId: string) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
      });
      return profile;
    } catch (e) {
      console.error("getProfile:", userId, e);
      // Missing/invalid id should be findUnique → null; this catches DB/Prisma faults
      return null;
    }
  },

  async getUserStatus(userId: string) {
    const strike = await prisma.userStrike.findUnique({
      where: { userId },
    });

    const restriction = await prisma.userRestriction.findFirst({
      where: {
        userId,
        restrictedUntil: { gt: new Date() },
      },
    });

    const isBanned = strike?.isBanned ?? false;
    const isRestricted = strike?.isRestricted ?? !!restriction;
    const restrictionEnd = restriction?.restrictedUntil?.toISOString();
    const banReason = strike?.banReason;
    const canAct = !isBanned && !isRestricted;

    return {
      can_act: canAct,
      is_banned: isBanned,
      is_restricted: isRestricted,
      ban_reason: banReason,
      restriction_end: restrictionEnd,
      status: isBanned ? "banned" : isRestricted ? "restricted" : "active",
    };
  },
};
