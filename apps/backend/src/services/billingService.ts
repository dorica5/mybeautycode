import { prisma } from "../lib/prisma";
import {
  billingConfig,
  type ProBillingStatusPayload,
} from "../config/billingConfig";

export const VISIT_LIMIT_ERROR_CODE = "VISIT_LIMIT_EXCEEDED";

function subscriptionIsActive(row: {
  entitlementActive: boolean;
  entitlementExpiresAt: Date | null;
} | null): boolean {
  if (billingConfig.DEV_BYPASS) return true;
  if (!row?.entitlementActive) return false;
  if (!row.entitlementExpiresAt) return true;
  return row.entitlementExpiresAt.getTime() > Date.now();
}

type SubscriptionRow = {
  entitlementActive: boolean;
  entitlementExpiresAt: Date | null;
  plan: string | null;
} | null;

/** Tolerates stale Prisma client or missing migration for `professional_subscriptions`. */
async function fetchProfessionalSubscription(
  profileId: string
): Promise<SubscriptionRow> {
  try {
    const delegate = (
      prisma as {
        professionalSubscription?: {
          findUnique: (args: {
            where: { profileId: string };
          }) => Promise<SubscriptionRow>;
        };
      }
    ).professionalSubscription;
    if (!delegate?.findUnique) {
      return null;
    }
    return await delegate.findUnique({ where: { profileId } });
  } catch (err) {
    console.warn("professionalSubscription lookup skipped:", err);
    return null;
  }
}

async function professionalProfileIdFor(profileId: string): Promise<string | null> {
  const pp = await prisma.professionalProfile.findUnique({
    where: { profileId },
    select: { id: true },
  });
  return pp?.id ?? null;
}

async function countProfessionalVisits(professionalProfileId: string): Promise<number> {
  return prisma.serviceRecord.count({
    where: { professionalProfileId },
  });
}

export const billingService = {
  async isProfessional(profileId: string): Promise<boolean> {
    const ppId = await professionalProfileIdFor(profileId);
    return ppId != null;
  },

  async getProBillingStatus(profileId: string): Promise<ProBillingStatusPayload> {
    const ppId = await professionalProfileIdFor(profileId);
    if (!ppId) {
      return {
        isProfessional: false,
        visitCount: 0,
        freeVisitLimit: billingConfig.FREE_VISIT_LIMIT,
        remainingFreeVisits: billingConfig.FREE_VISIT_LIMIT,
        hasActiveSubscription: false,
        canCreateVisit: true,
        canViewVisits: true,
        atVisitLimit: false,
        monthlyPriceNok: billingConfig.MONTHLY_PRICE_NOK,
        entitlementExpiresAt: null,
        plan: null,
        discoveryAlwaysFree: true,
      };
    }

    const [visitCount, sub] = await Promise.all([
      countProfessionalVisits(ppId),
      fetchProfessionalSubscription(profileId),
    ]);

    const hasActiveSubscription = subscriptionIsActive(sub);
    const freeVisitLimit = billingConfig.FREE_VISIT_LIMIT;
    const atVisitLimit = visitCount >= freeVisitLimit;
    const canUseVisits = hasActiveSubscription || !atVisitLimit;
    const remainingFreeVisits = Math.max(0, freeVisitLimit - visitCount);

    return {
      isProfessional: true,
      visitCount,
      freeVisitLimit,
      remainingFreeVisits,
      hasActiveSubscription,
      canCreateVisit: canUseVisits,
      canViewVisits: canUseVisits,
      atVisitLimit,
      monthlyPriceNok: billingConfig.MONTHLY_PRICE_NOK,
      entitlementExpiresAt: sub?.entitlementExpiresAt?.toISOString() ?? null,
      plan: sub?.plan ?? null,
      discoveryAlwaysFree: true,
    };
  },

  async assertProCanCreateVisit(profileId: string): Promise<void> {
    const status = await this.getProBillingStatus(profileId);
    if (!status.isProfessional) return;
    if (status.canCreateVisit) return;
    throw Object.assign(new Error("Visit limit reached"), {
      statusCode: 402,
      code: VISIT_LIMIT_ERROR_CODE,
      billing: status,
    });
  },

  async assertProCanViewVisits(profileId: string): Promise<void> {
    const status = await this.getProBillingStatus(profileId);
    if (!status.isProfessional) return;
    if (status.canViewVisits) return;
    throw Object.assign(new Error("Visit limit reached"), {
      statusCode: 402,
      code: VISIT_LIMIT_ERROR_CODE,
      billing: status,
    });
  },

  /**
   * Mobile sync after RevenueCat purchase / restore.
   * Webhook handler should eventually be the source of truth.
   */
  async syncEntitlementFromClient(
    profileId: string,
    input: {
      entitlementActive: boolean;
      entitlementExpiresAt?: string | null;
      plan?: string | null;
      revenueCatAppUserId?: string | null;
    }
  ) {
    const expiresAt =
      input.entitlementExpiresAt?.trim()
        ? new Date(input.entitlementExpiresAt)
        : null;
    const now = new Date();

    const delegate = (
      prisma as {
        professionalSubscription?: {
          upsert: (args: unknown) => Promise<unknown>;
        };
      }
    ).professionalSubscription;
    if (!delegate?.upsert) {
      throw Object.assign(
        new Error(
          "Subscription storage is unavailable. Run prisma generate and migrate in the backend."
        ),
        { statusCode: 503 as const }
      );
    }

    await delegate.upsert({
      where: { profileId },
      create: {
        profileId,
        entitlementActive: input.entitlementActive,
        entitlementExpiresAt: expiresAt,
        plan: input.plan?.trim() || null,
        revenueCatAppUserId: input.revenueCatAppUserId?.trim() || profileId,
        lastSyncedAt: now,
      },
      update: {
        entitlementActive: input.entitlementActive,
        entitlementExpiresAt: expiresAt,
        plan: input.plan?.trim() || null,
        revenueCatAppUserId: input.revenueCatAppUserId?.trim() || profileId,
        lastSyncedAt: now,
        updatedAt: now,
      },
    });

    return this.getProBillingStatus(profileId);
  },

  /** Stub for RevenueCat webhooks — extend when dashboard is configured. */
  async handleRevenueCatWebhook(_payload: unknown) {
    return { received: true, processed: false };
  },
};
