import { prisma } from "../lib/prisma";
import type { Prisma } from "@prisma/client";

export type ProductEventInput = {
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
};

export const activityLogService = {
  async record(userId: string | undefined, input: ProductEventInput) {
    const eventType = input.eventType?.trim();
    if (!eventType || eventType.length > 120) return;

    try {
      await prisma.activityLog.create({
        data: {
          userId: userId ?? null,
          eventType,
          entityType: input.entityType?.trim() || null,
          entityId: input.entityId?.trim() || null,
          payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      console.warn("activityLogService.record skipped:", err);
    }
  },

  async countDistinctUsersSince(since: Date): Promise<number> {
    try {
      const rows = await prisma.activityLog.findMany({
        where: {
          createdAt: { gte: since },
          userId: { not: null },
        },
        distinct: ["userId"],
        select: { userId: true },
      });
      return rows.length;
    } catch {
      return 0;
    }
  },

  async countsByEventTypeSince(
    since: Date
  ): Promise<{ eventType: string; count: number }[]> {
    try {
      const grouped = await prisma.activityLog.groupBy({
        by: ["eventType"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { eventType: "desc" } },
      });
      return grouped.map((g) => ({
        eventType: g.eventType,
        count: g._count._all,
      }));
    } catch {
      return [];
    }
  },
};
