import { prisma } from "../lib/prisma";
import { normalizeProfessionCodeInput } from "../lib/normalizeProfessionCode";
import { professionService } from "./professionService";

export type BlockedUserRow = {
  blocked_id: string;
  profession_code: string;
};

async function removeClientLinkForLane(
  profileA: string,
  profileB: string,
  professionCode: string
): Promise<void> {
  const code = normalizeProfessionCodeInput(professionCode);
  const professionId = await professionService.getProfessionIdByCode(code);
  const profProfileIdA =
    await professionService.getOrCreateProfessionalProfileId(profileA);
  const profProfileIdB =
    await professionService.getOrCreateProfessionalProfileId(profileB);

  await prisma.clientProfessionalLink.deleteMany({
    where: {
      professionId,
      OR: [
        { professionalProfileId: profProfileIdA, clientUserId: profileB },
        { professionalProfileId: profProfileIdB, clientUserId: profileA },
      ],
    },
  });
}

export const moderationService = {
  async getBlockedIds(blockerId: string): Promise<BlockedUserRow[]> {
    const rows = await prisma.blockedUser.findMany({
      where: { blockerId },
      select: { blockedId: true, professionCode: true },
    });
    return rows.map((r) => ({
      blocked_id: r.blockedId,
      profession_code: r.professionCode,
    }));
  },

  async getAllBlockerIds(
    blockedId: string,
    professionCode?: string | null
  ): Promise<string[]> {
    const where: { blockedId: string; professionCode?: string } = {
      blockedId,
    };
    if (typeof professionCode === "string" && professionCode.trim()) {
      where.professionCode = normalizeProfessionCodeInput(professionCode);
    }
    const rows = await prisma.blockedUser.findMany({
      where,
      select: { blockerId: true },
    });
    return rows.map((r) => r.blockerId);
  },

  async isBlocked(
    blockerId: string,
    blockedId: string,
    professionCode: string
  ): Promise<boolean> {
    const code = normalizeProfessionCodeInput(professionCode);
    const row = await prisma.blockedUser.findFirst({
      where: { blockerId, blockedId, professionCode: code },
    });
    return !!row;
  },

  async block(
    blockerId: string,
    blockedId: string,
    reason: string,
    professionCode: string
  ) {
    const code = normalizeProfessionCodeInput(professionCode);
    if (!code) {
      throw Object.assign(new Error("profession_code is required"), {
        statusCode: 400,
      });
    }

    await prisma.blockedUser.upsert({
      where: {
        blockerId_blockedId_professionCode: {
          blockerId,
          blockedId,
          professionCode: code,
        },
      },
      create: {
        blockerId,
        blockedId,
        professionCode: code,
        reason,
      },
      update: { reason },
    });

    await removeClientLinkForLane(blockerId, blockedId, code);
    return { success: true };
  },

  async unblock(
    blockerId: string,
    blockedId: string,
    professionCode: string
  ) {
    const code = normalizeProfessionCodeInput(professionCode);
    if (!code) {
      throw Object.assign(new Error("profession_code is required"), {
        statusCode: 400,
      });
    }

    await prisma.blockedUser.deleteMany({
      where: { blockerId, blockedId, professionCode: code },
    });
    await removeClientLinkForLane(blockerId, blockedId, code);
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
    additionalDetails?: string,
    professionCode?: string | null
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

    if (typeof professionCode === "string" && professionCode.trim()) {
      await removeClientLinkForLane(
        reporterId,
        reportedId,
        professionCode.trim()
      );
    } else {
      const reporterProfId =
        await professionService.getOrCreateProfessionalProfileId(reporterId);
      const reportedProfId =
        await professionService.getOrCreateProfessionalProfileId(reportedId);
      await prisma.clientProfessionalLink.deleteMany({
        where: {
          OR: [
            {
              professionalProfileId: reporterProfId,
              clientUserId: reportedId,
            },
            {
              professionalProfileId: reportedProfId,
              clientUserId: reporterId,
            },
          ],
        },
      });
    }

    const status = await this.getUserStatus(reportedId);
    return {
      success: true,
      totalReports: status.totalReports + 1,
      userStatus: status.status,
    };
  },
};
