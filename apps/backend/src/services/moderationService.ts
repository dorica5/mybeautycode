import { prisma } from "../lib/prisma";
import { professionService } from "./professionService";

export const moderationService = {
  async getBlockedIds(blockerId: string) {
    const rows = await prisma.blockedUser.findMany({
      where: { blockerId },
      select: { blockedId: true },
    });
    return rows.map((r) => r.blockedId);
  },

  async getAllBlockerIds(blockedId: string) {
    const rows = await prisma.blockedUser.findMany({
      where: { blockedId },
      select: { blockerId: true },
    });
    return rows.map((r) => r.blockerId);
  },

  async isBlocked(blockerId: string, blockedId: string) {
    const row = await prisma.blockedUser.findFirst({
      where: { blockerId, blockedId },
    });
    return !!row;
  },

  async block(blockerId: string, blockedId: string, reason: string) {
    await prisma.blockedUser.create({
      data: { blockerId, blockedId, reason },
    });
    const blockerProfId = await professionService.getOrCreateProfessionalProfileId(blockerId);
    const blockedProfId = await professionService.getOrCreateProfessionalProfileId(blockedId);
    await prisma.clientProfessionalLink.deleteMany({
      where: {
        OR: [
          { professionalProfileId: blockerProfId, clientUserId: blockedId },
          { professionalProfileId: blockedProfId, clientUserId: blockerId },
        ],
      },
    });
    return { success: true };
  },

  async unblock(blockerId: string, blockedId: string) {
    await prisma.blockedUser.deleteMany({
      where: { blockerId, blockedId },
    });
    return { success: true };
  },

  async getUserStatus(userId: string) {
    const strike = await prisma.userStrike.findUnique({
      where: { userId },
    });
    const [reportedCount] = await Promise.all([
      prisma.reportedUser.count({ where: { reportedId: userId } }),
    ]);
    return {
      isBanned: strike?.isBanned ?? false,
      isRestricted: strike?.isRestricted ?? false,
      strikeCount: strike?.strikeCount ?? 0,
      totalReports: reportedCount,
      banReason: strike?.banReason,
      status: strike?.isBanned
        ? "banned"
        : strike?.isRestricted
        ? "restricted"
        : "active",
    };
  },

  async report(
    reporterId: string,
    reportedId: string,
    reason: string,
    additionalDetails?: string
  ) {
    const existing = await prisma.reportedUser.findFirst({
      where: { reporterId, reportedId },
    });
    if (existing) throw new Error("You have already reported this user");

    await prisma.reportedUser.create({
      data: {
        reporterId,
        reportedId,
        reason,
        status: "pending",
        adminNotes: additionalDetails,
      },
    });
    const reporterProfId = await professionService.getOrCreateProfessionalProfileId(reporterId);
    const reportedProfId = await professionService.getOrCreateProfessionalProfileId(reportedId);
    await prisma.clientProfessionalLink.deleteMany({
      where: {
        OR: [
          { professionalProfileId: reporterProfId, clientUserId: reportedId },
          { professionalProfileId: reportedProfId, clientUserId: reporterId },
        ],
      },
    });
    const status = await this.getUserStatus(reportedId);
    return {
      success: true,
      totalReports: status.totalReports + 1,
      userStatus: status.status,
    };
  },
};
