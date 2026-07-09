import { prisma } from "../lib/prisma";
import { normalizeProfessionCodeInput } from "../lib/normalizeProfessionCode";
import { profileDisplayName } from "../lib/profileDisplay";
import {
  AUTO_RESTRICT_AFTER_REPORTS,
  HIGH_SEVERITY_AUTO_RESTRICT_AFTER,
  isHighSeverityReportReason,
  reportPriorityForReason,
} from "../lib/reportMeta";
import { notifySlackUserReport } from "../lib/slackReport";
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
    professionCode?: string | null,
    context?: string | null
  ) {
    const existing = await prisma.reportedUser.findFirst({
      where: { reporterId, reportedId },
    });
    if (existing) throw new Error("You have already reported this user");

    const lane =
      typeof professionCode === "string" && professionCode.trim()
        ? normalizeProfessionCodeInput(professionCode.trim())
        : null;
    const priority = reportPriorityForReason(reason);
    const adminNotesParts = [
      additionalDetails?.trim() || null,
      context?.trim() ? `Context: ${context.trim()}` : null,
      lane ? `Lane: ${lane}` : null,
    ].filter(Boolean);

    const reportRow = await prisma.reportedUser.create({
      data: {
        reporterId,
        reportedId,
        reason,
        status: "pending",
        priority,
        adminNotes: adminNotesParts.length ? adminNotesParts.join("\n") : null,
      },
    });

    if (lane) {
      await removeClientLinkForLane(reporterId, reportedId, lane);
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

    let blockedForReporter = false;
    if (lane) {
      try {
        await this.block(reporterId, reportedId, `report:${reason}`, lane);
        blockedForReporter = true;
      } catch (err) {
        console.warn("[moderation] auto-block after report failed:", err);
      }
    }

    const totalReports = await prisma.reportedUser.count({
      where: { reportedId },
    });

    const restrictThreshold = isHighSeverityReportReason(reason)
      ? HIGH_SEVERITY_AUTO_RESTRICT_AFTER
      : AUTO_RESTRICT_AFTER_REPORTS;
    let autoRestricted = false;
    if (totalReports >= restrictThreshold) {
      await prisma.userStrike.upsert({
        where: { userId: reportedId },
        create: {
          userId: reportedId,
          strikeCount: totalReports,
          isRestricted: true,
          lastStrikeDate: new Date(),
          adminNotes: `Auto-restricted after ${totalReports} report(s). Latest: ${reason}.`,
        },
        update: {
          strikeCount: totalReports,
          isRestricted: true,
          lastStrikeDate: new Date(),
          adminNotes: `Auto-restricted after ${totalReports} report(s). Latest: ${reason}.`,
        },
      });
      autoRestricted = true;
    }

    const [reporter, reported] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: reporterId },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
      prisma.profile.findUnique({
        where: { id: reportedId },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
    ]);

    void notifySlackUserReport({
      reportId: reportRow.id,
      reason,
      priority,
      reporterName: profileDisplayName(reporter ?? {}) ?? reporterId,
      reporterEmail: reporter?.email ?? null,
      reporterId,
      reportedName: profileDisplayName(reported ?? {}) ?? reportedId,
      reportedEmail: reported?.email ?? null,
      reportedId,
      professionCode: lane,
      context: context?.trim() || null,
      additionalDetails: additionalDetails?.trim() || null,
      totalReportsOnUser: totalReports,
      autoRestricted,
      blockedForReporter,
    });

    const status = await this.getUserStatus(reportedId);
    return {
      success: true,
      reportId: reportRow.id,
      totalReports,
      userStatus: status.status,
      autoBlocked: autoRestricted,
      blockedForReporter,
    };
  },
};
