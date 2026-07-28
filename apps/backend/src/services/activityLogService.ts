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

  async countEventsSince(eventTypes: string[], since: Date): Promise<number> {
    if (eventTypes.length === 0) return 0;
    try {
      return await prisma.activityLog.count({
        where: {
          eventType: { in: eventTypes },
          createdAt: { gte: since },
        },
      });
    } catch {
      return 0;
    }
  },

  async countDistinctUsersForEventTypesSince(
    eventTypes: string[],
    since: Date
  ): Promise<number> {
    if (eventTypes.length === 0) return 0;
    try {
      const rows = await prisma.activityLog.findMany({
        where: {
          eventType: { in: eventTypes },
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

  async countsForEventTypesSince(
    eventTypes: string[],
    since: Date
  ): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const t of eventTypes) out[t] = 0;
    if (eventTypes.length === 0) return out;
    try {
      const grouped = await prisma.activityLog.groupBy({
        by: ["eventType"],
        where: {
          eventType: { in: eventTypes },
          createdAt: { gte: since },
        },
        _count: { _all: true },
      });
      for (const g of grouped) {
        out[g.eventType] = g._count._all;
      }
    } catch {
      /* empty */
    }
    return out;
  },

  async trendForEventType(
    eventType: string,
    days: number
  ): Promise<{ date: string; count: number }[]> {
    try {
      const rows = await prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day,
               COUNT(*)::bigint AS count
        FROM activity_logs
        WHERE event_type = ${eventType}
          AND created_at >= NOW() - (${days} * INTERVAL '1 day')
        GROUP BY 1
        ORDER BY 1`;
      return rows.map((r) => ({ date: r.day, count: Number(r.count) }));
    } catch {
      return [];
    }
  },
};
