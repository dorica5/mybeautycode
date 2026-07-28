import { prisma } from "../lib/prisma";
import { subscriptionEntitlementIsActive } from "./billingService";
import { activityLogService } from "./activityLogService";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type AdminMetricsPayload = {
  generatedAt: string;
  users: {
    total: number;
    clients: number;
    professionals: number;
    setupComplete: number;
    setupIncomplete: number;
    signupsLast7Days: number;
    signupsLast30Days: number;
  };
  engagement: {
    activeUsersLast7Days: number;
    activeUsersLast30Days: number;
    visitsLast7Days: number;
    visitsLast30Days: number;
    visitsTotal: number;
    inspirationsLast7Days: number;
    inspirationsTotal: number;
    inspirationSharesLast7Days: number;
    clientProLinksTotal: number;
    clientProLinksActive: number;
  };
  professionals: {
    multiProfessionAccounts: number;
    withSalonOnMap: number;
    byProfession: { code: string; count: number }[];
    profileViewsTotal: number;
    bookingClicksTotal: number;
  };
  subscriptions: {
    activeInDatabase: number;
    revenueCatReady: boolean;
    webhookConfigured: boolean;
  };
  funnel: {
    signedUp: number;
    setupComplete: number;
    withAtLeastOneVisit: number;
    withAtLeastOneInspiration: number;
    withClientProLink: number;
  };
  geography: { country: string; count: number }[];
  productEventsLast7Days: { eventType: string; count: number }[];
  trends: {
    signupsByDay: { date: string; count: number }[];
    visitsByDay: { date: string; count: number }[];
  };
};

export const adminMetricsService = {
  async getMetrics(): Promise<AdminMetricsPayload> {
    const now = new Date();
    const since7 = daysAgo(7);
    const since30 = daysAgo(30);

    const [
      totalUsers,
      setupComplete,
      professionalCount,
      signups7,
      signups30,
      visits7,
      visits30,
      visitsTotal,
      inspirations7,
      inspirationsTotal,
      shares7,
      linksTotal,
      linksActive,
      multiProfession,
      prosWithSalon,
      professionRows,
      analyticsTotals,
      activeSubsRows,
      funnelVisitUsers,
      funnelInspirationUsers,
      funnelLinkUsers,
      countryRows,
      active7,
      active30,
      events7,
      signupTrend,
      visitTrend,
    ] = await Promise.all([
      prisma.profile.count(),
      prisma.profile.count({ where: { setupStatus: true } }),
      prisma.professionalProfile.count(),
      prisma.profile.count({ where: { createdAt: { gte: since7 } } }),
      prisma.profile.count({ where: { createdAt: { gte: since30 } } }),
      prisma.serviceRecord.count({ where: { createdAt: { gte: since7 } } }),
      prisma.serviceRecord.count({ where: { createdAt: { gte: since30 } } }),
      prisma.serviceRecord.count(),
      prisma.inspiration.count({ where: { createdAt: { gte: since7 } } }),
      prisma.inspiration.count(),
      prisma.sharedInspiration.count({ where: { createdAt: { gte: since7 } } }),
      prisma.clientProfessionalLink.count(),
      prisma.clientProfessionalLink.count({ where: { status: "active" } }),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM (
          SELECT professional_profile_id
          FROM professional_professions
          GROUP BY professional_profile_id
          HAVING COUNT(*) > 1
        ) t`,
      prisma.professionalProfession.count({
        where: { salonId: { not: null } },
      }),
      prisma.$queryRaw<{ code: string; count: bigint }[]>`
        SELECT p.code, COUNT(pp.id)::bigint AS count
        FROM professional_professions pp
        JOIN professions p ON p.id = pp.profession_id
        GROUP BY p.code
        ORDER BY count DESC`,
      prisma.professionalProfession.aggregate({
        _sum: {
          profileViewCount: true,
          bookingClickCount: true,
        },
      }),
      prisma.professionalSubscription.findMany({
        select: {
          entitlementActive: true,
          entitlementExpiresAt: true,
        },
      }),
      prisma.serviceRecord.findMany({
        distinct: ["clientUserId"],
        select: { clientUserId: true },
      }),
      prisma.inspiration.findMany({
        distinct: ["ownerId"],
        select: { ownerId: true },
      }),
      prisma.clientProfessionalLink.findMany({
        distinct: ["clientUserId"],
        select: { clientUserId: true },
      }),
      prisma.$queryRaw<{ country: string; count: bigint }[]>`
        SELECT COALESCE(NULLIF(TRIM(country), ''), 'Unknown') AS country,
               COUNT(*)::bigint AS count
        FROM profiles
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 20`,
      activityLogService.countDistinctUsersSince(since7),
      activityLogService.countDistinctUsersSince(since30),
      activityLogService.countsByEventTypeSince(since7),
      prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day,
               COUNT(*)::bigint AS count
        FROM profiles
        WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY 1
        ORDER BY 1`,
      prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day,
               COUNT(*)::bigint AS count
        FROM service_records
        WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY 1
        ORDER BY 1`,
    ]);

    const activeInDatabase = activeSubsRows.filter((row) =>
      subscriptionEntitlementIsActive(row)
    ).length;

    const clients = Math.max(0, totalUsers - professionalCount);

    return {
      generatedAt: now.toISOString(),
      users: {
        total: totalUsers,
        clients,
        professionals: professionalCount,
        setupComplete,
        setupIncomplete: totalUsers - setupComplete,
        signupsLast7Days: signups7,
        signupsLast30Days: signups30,
      },
      engagement: {
        activeUsersLast7Days: active7,
        activeUsersLast30Days: active30,
        visitsLast7Days: visits7,
        visitsLast30Days: visits30,
        visitsTotal,
        inspirationsLast7Days: inspirations7,
        inspirationsTotal,
        inspirationSharesLast7Days: shares7,
        clientProLinksTotal: linksTotal,
        clientProLinksActive: linksActive,
      },
      professionals: {
        multiProfessionAccounts: Number(multiProfession[0]?.count ?? 0),
        withSalonOnMap: prosWithSalon,
        byProfession: professionRows.map((r) => ({
          code: r.code,
          count: Number(r.count),
        })),
        profileViewsTotal: analyticsTotals._sum.profileViewCount ?? 0,
        bookingClicksTotal: analyticsTotals._sum.bookingClickCount ?? 0,
      },
      subscriptions: {
        activeInDatabase: activeInDatabase,
        revenueCatReady: true,
        webhookConfigured: Boolean(process.env.REVENUECAT_WEBHOOK_SECRET?.trim()),
      },
      funnel: {
        signedUp: totalUsers,
        setupComplete,
        withAtLeastOneVisit: funnelVisitUsers.length,
        withAtLeastOneInspiration: funnelInspirationUsers.length,
        withClientProLink: funnelLinkUsers.length,
      },
      geography: countryRows.map((r) => ({
        country: r.country,
        count: Number(r.count),
      })),
      productEventsLast7Days: events7,
      trends: {
        signupsByDay: signupTrend.map((r) => ({
          date: r.day,
          count: Number(r.count),
        })),
        visitsByDay: visitTrend.map((r) => ({
          date: r.day,
          count: Number(r.count),
        })),
      },
    };
  },
};
