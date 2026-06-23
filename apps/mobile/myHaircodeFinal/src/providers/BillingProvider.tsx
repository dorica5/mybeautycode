import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Purchases, { CustomerInfo } from "react-native-purchases";
import {
  fetchProBillingStatus,
  syncProEntitlement,
  useProBillingStatus,
  useInvalidateProBilling,
} from "@/src/api/billing";
import {
  defaultProBillingStatus,
  type ProBillingStatus,
} from "@/src/constants/billingConfig";
import { useAuth } from "@/src/providers/AuthProvider";
import { profileHasProfessionalCapability } from "@/src/constants/professionCodes";
import { BYPASS_PRO_PAYWALL_FOR_DEV } from "@/src/lib/subscriptionFlags";
import {
  configureRevenueCat,
  entitlementExpiresAtIso,
  getCustomerInfoSafe,
  getRevenueCatApiKey,
  hasActiveEntitlement,
} from "@/src/lib/revenuecat";

type BillingContextValue = {
  billing: ProBillingStatus | null;
  /** True when the logged-in user is on the professional surface. */
  isProAccount: boolean;
  loading: boolean;
  revenueCatReady: boolean;
  refreshBilling: () => Promise<void>;
  syncFromRevenueCat: (info?: CustomerInfo | null) => Promise<void>;
};

const BillingContext = createContext<BillingContextValue>({
  billing: null,
  isProAccount: false,
  loading: false,
  revenueCatReady: false,
  refreshBilling: async () => {},
  syncFromRevenueCat: async () => {},
});

async function pushEntitlementToBackend(info: CustomerInfo | null) {
  const active = hasActiveEntitlement(info);
  return syncProEntitlement({
    entitlementActive: active,
    entitlementExpiresAt: entitlementExpiresAtIso(info),
    plan: active ? "premium" : null,
  });
}

function normalizeBillingForPro(
  isPro: boolean,
  data: ProBillingStatus | undefined,
  isLoading: boolean
): ProBillingStatus | null {
  if (!isPro) return null;

  if (BYPASS_PRO_PAYWALL_FOR_DEV) {
    const base = data?.isProfessional
      ? data
      : defaultProBillingStatus(data ?? {});
    return {
      ...base,
      isProfessional: true,
      hasActiveSubscription: true,
      canCreateVisit: true,
      canViewVisits: true,
      atVisitLimit: false,
      plan: "dev_bypass",
    };
  }

  if (data?.isProfessional) return data;

  // Pro app surface but API missing/failed — still show quota UI with defaults.
  if (data && !data.isProfessional) {
    return defaultProBillingStatus({
      visitCount: data.visitCount,
      freeVisitLimit: data.freeVisitLimit,
      monthlyPriceNok: data.monthlyPriceNok,
    });
  }

  if (data) return { ...defaultProBillingStatus(), ...data, isProfessional: true };

  if (!isLoading) return defaultProBillingStatus();

  return null;
}

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const isPro = profileHasProfessionalCapability(profile);
  const invalidateBilling = useInvalidateProBilling();
  const { data, isLoading, refetch } = useProBillingStatus(isPro);
  const [revenueCatReady, setRevenueCatReady] = useState(false);

  useEffect(() => {
    if (!profile?.id || !isPro) {
      setRevenueCatReady(false);
      return;
    }

    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
      setRevenueCatReady(false);
      return;
    }

    let alive = true;
    (async () => {
      try {
        configureRevenueCat(apiKey, profile.id);
        if (!alive) return;
        setRevenueCatReady(true);
        const info = await getCustomerInfoSafe(true);
        if (!alive) return;
        if (info && hasActiveEntitlement(info)) {
          await pushEntitlementToBackend(info);
          await invalidateBilling();
        }
      } catch (e) {
        console.warn("RevenueCat init failed", e);
      }
    })();

    const sub = Purchases.addCustomerInfoUpdateListener((info) => {
      void (async () => {
        try {
          await pushEntitlementToBackend(info);
          await invalidateBilling();
        } catch (e) {
          console.warn("RevenueCat sync failed", e);
        }
      })();
    });

    return () => {
      alive = false;
      if (sub && typeof sub.remove === "function") {
        sub.remove();
      }
    };
  }, [profile?.id, isPro, invalidateBilling]);

  const billing = useMemo(
    () => normalizeBillingForPro(isPro, data, isLoading),
    [isPro, data, isLoading]
  );

  const refreshBilling = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const syncFromRevenueCat = useCallback(
    async (info?: CustomerInfo | null) => {
      const ci = info ?? (await getCustomerInfoSafe(true));
      await pushEntitlementToBackend(ci);
      await invalidateBilling();
      await refetch();
    },
    [invalidateBilling, refetch]
  );

  return (
    <BillingContext.Provider
      value={{
        billing,
        isProAccount: isPro,
        loading: isPro && isLoading && !billing,
        revenueCatReady,
        refreshBilling,
        syncFromRevenueCat,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  return useContext(BillingContext);
}

/** Prefetch billing status after visit mutations. */
export async function refreshBillingStatusCache() {
  try {
    await fetchProBillingStatus();
  } catch {
    /* optional */
  }
}
