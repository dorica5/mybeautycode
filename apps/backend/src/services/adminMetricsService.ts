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

const MARKETING_EVENT_TYPES = [
  "profile_view",
  "booking_click",
  "social_click",
  "phone_click",
  "paywall_viewed",
  "paywall_opened",
  "subscription_purchased",
  "subscription_purchase_started",
  "client_pro_link_created",
  "client_link_requested",
  "client_link_accepted",
  "client_link_declined",
  "feedback_submitted",
  "signed_up",
  "login",
  "profile_completed",
  "inspiration_saved",
  "inspiration_shared",
  "visit_added",
  "visit_edited",
  "discover_profession_selected",
  "search_performed",
  "discover_pro_selected",
  "discover_pro_opened",
  "discover_map_cta",
  "home_cta_tapped",
  "notification_opened",
  "notifications_tab_opened",
] as const;

function parseSocialClickCounts(raw: unknown): Record<string, number> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out[k] = Math.trunc(n);
  }
  return out;
}

function aggregateSocialByPlatform(
  rows: { socialClickCounts: unknown }[]
): { platform: string; count: number }[] {
  const totals: Record<string, number> = {};
  for (const row of rows) {
    const counts = parseSocialClickCounts(row.socialClickCounts);
    for (const [platform, count] of Object.entries(counts)) {
      totals[platform] = (totals[platform] ?? 0) + count;
    }
  }
  return Object.entries(totals)
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);
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
  map: {
    usersLast7Days: number;
    usersLast30Days: number;
    opensLast7Days: number;
    opensLast30Days: number;
    opensTotal: number;
    searchesLast7Days: number;
    pinOpensLast7Days: number;
    proProfileOpensLast7Days: number;
    byEventLast7Days: { eventType: string; count: number }[];
    opensByDay: { date: string; count: number }[];
  };
  marketing: {
    profileViewsTotal: number;
    bookingClicksTotal: number;
    socialClicksTotal: number;
    bookingRatePct: number;
    profileViewsLast7Days: number;
    bookingClicksLast7Days: number;
    socialClicksLast7Days: number;
    phoneClicksLast7Days: number;
    paywallViewsLast7Days: number;
    paywallOpensLast7Days: number;
    subscriptionsPurchasedLast7Days: number;
    clientLinksCreatedLast7Days: number;
    feedbackSubmittedLast7Days: number;
    signupsTrackedLast7Days: number;
    socialByPlatform: { platform: string; count: number }[];
    keyEventsLast7Days: { eventType: string; count: number }[];
  };
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

    const mapEventTypes = [
      "map_opened",
      "map_location_searched",
      "map_pin_opened",
      "map_pro_opened",
    ] as const;

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
      mapUsers7,
      mapUsers30,
      mapOpens7,
      mapOpens30,
      mapOpensTotal,
      mapCounts7,
      mapOpensTrend,
      socialAgg,
      socialPlatformRows,
      marketingCounts7,
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
      activityLogService.countDistinctUsersForEventTypesSince(
        [...mapEventTypes],
        since7
      ),
      activityLogService.countDistinctUsersForEventTypesSince(
        [...mapEventTypes],
        since30
      ),
      activityLogService.countEventsSince(["map_opened"], since7),
      activityLogService.countEventsSince(["map_opened"], since30),
      activityLogService.countEventsSince(["map_opened"], new Date(0)),
      activityLogService.countsForEventTypesSince([...mapEventTypes], since7),
      activityLogService.trendForEventType("map_opened", 14),
      prisma.professionalProfession.aggregate({
        _sum: { socialClickCount: true },
      }),
      prisma.professionalProfession.findMany({
        where: { socialClickCount: { gt: 0 } },
        select: { socialClickCounts: true },
      }),
      activityLogService.countsForEventTypesSince(
        [...MARKETING_EVENT_TYPES],
        since7
      ),
    ]);

    const activeInDatabase = activeSubsRows.filter((row) =>
      subscriptionEntitlementIsActive(row)
    ).length;

    const clients = Math.max(0, totalUsers - professionalCount);

    const profileViewsTotal = analyticsTotals._sum.profileViewCount ?? 0;
    const bookingClicksTotal = analyticsTotals._sum.bookingClickCount ?? 0;
    const socialClicksTotal = socialAgg._sum.socialClickCount ?? 0;
    const bookingRatePct =
      profileViewsTotal > 0
        ? Math.round((bookingClicksTotal / profileViewsTotal) * 100)
        : 0;

    const marketingKeyEvents = MARKETING_EVENT_TYPES.map((eventType) => ({
      eventType,
      count: marketingCounts7[eventType] ?? 0,
    })).filter((row) => row.count > 0);

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
        profileViewsTotal,
        bookingClicksTotal: bookingClicksTotal,
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
      map: {
        usersLast7Days: mapUsers7,
        usersLast30Days: mapUsers30,
        opensLast7Days: mapOpens7,
        opensLast30Days: mapOpens30,
        opensTotal: mapOpensTotal,
        searchesLast7Days: mapCounts7.map_location_searched ?? 0,
        pinOpensLast7Days: mapCounts7.map_pin_opened ?? 0,
        proProfileOpensLast7Days: mapCounts7.map_pro_opened ?? 0,
        byEventLast7Days: mapEventTypes.map((eventType) => ({
          eventType,
          count: mapCounts7[eventType] ?? 0,
        })),
        opensByDay: mapOpensTrend,
      },
      marketing: {
        profileViewsTotal,
        bookingClicksTotal,
        socialClicksTotal,
        bookingRatePct,
        profileViewsLast7Days: marketingCounts7.profile_view ?? 0,
        bookingClicksLast7Days: marketingCounts7.booking_click ?? 0,
        socialClicksLast7Days: marketingCounts7.social_click ?? 0,
        phoneClicksLast7Days: marketingCounts7.phone_click ?? 0,
        paywallViewsLast7Days: marketingCounts7.paywall_viewed ?? 0,
        paywallOpensLast7Days: marketingCounts7.paywall_opened ?? 0,
        subscriptionsPurchasedLast7Days:
          marketingCounts7.subscription_purchased ?? 0,
        clientLinksCreatedLast7Days:
          marketingCounts7.client_pro_link_created ?? 0,
        feedbackSubmittedLast7Days: marketingCounts7.feedback_submitted ?? 0,
        signupsTrackedLast7Days: marketingCounts7.signed_up ?? 0,
        socialByPlatform: aggregateSocialByPlatform(socialPlatformRows),
        keyEventsLast7Days: marketingKeyEvents,
      },
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
