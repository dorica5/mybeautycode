import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import Purchases, { CustomerInfo } from "react-native-purchases";
import { getCustomerInfoSafe, hasActiveEntitlement } from "@/src/lib/revenuecat";

type Profile = {
  id: string;
  email?: string | null;
  user_type: "CLIENT" | "HAIRDRESSER";
  signup_date?: string | null;
};

const BETA_TESTERS = new Set<string>([
  "dorcasmihio@gmail.com",
  // ... all your testers
]);

const BETA_FREE_UNTIL = dayjs("2025-12-31T23:59:59Z");
const TRIAL_DAYS = 7;

export function usePaywallCheck(
  profile: Profile | null,
  loadingProfile: boolean,
  sessionCreatedAt?: string | null
) {
  const [checking, setChecking] = useState(true); // Start as true to prevent premature navigation
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  const isHairdresser = profile?.user_type === "HAIRDRESSER";
  const isClient = profile?.user_type === "CLIENT";
  const email = (profile?.email ?? "").trim().toLowerCase();
  const isBetaTester = useMemo(() => BETA_TESTERS.has(email), [email]);

  const trialStart = useMemo(() => {
    const src = sessionCreatedAt ?? profile?.signup_date ?? null;
    return src ? dayjs(src) : null;
  }, [profile, sessionCreatedAt]);

  const trialEndsAt = useMemo(() => {
    if (isBetaTester) return BETA_FREE_UNTIL;
    if (!trialStart) return dayjs(0);
    return trialStart.add(TRIAL_DAYS, "day");
  }, [isBetaTester, trialStart]);

  const trialExpired = useMemo(
    () => dayjs().isAfter(trialEndsAt),
    [trialEndsAt]
  );

  useEffect(() => {
    // Reset initial check when profile changes
    if (!profile || loadingProfile) {
      setChecking(false);
      setInitialCheckComplete(false);
      return;
    }

    // Hairdressers don't need paywall check
    if (isHairdresser) {
      setChecking(false);
      setInitialCheckComplete(true);
      return;
    }

    // If trial hasn't expired, no need to check RevenueCat
    if (isClient && !trialExpired) {
      setChecking(false);
      setInitialCheckComplete(true);
      return;
    }

    // For clients with expired trials, we MUST check RevenueCat
    let alive = true;
    setChecking(true);
    
    (async () => {
      try {
        console.log("Checking RevenueCat for subscription status...");
        const ci = await getCustomerInfoSafe(true); // Force refresh
        if (!alive) return;
        
        console.log("RevenueCat check complete:", {
          hasActiveEntitlement: hasActiveEntitlement(ci),
          entitlements: ci?.entitlements?.active
        });
        
        setInfo(ci);
        setInitialCheckComplete(true);
      } catch (error) {
        console.error("Error checking customer info:", error);
        // On error, assume no subscription
        setInfo(null);
        setInitialCheckComplete(true);
      } finally {
        if (alive) setChecking(false);
      }
    })();

    const sub = Purchases.addCustomerInfoUpdateListener((ci) => {
      if (!alive) return;
      console.log("RevenueCat subscription updated:", {
        hasActiveEntitlement: hasActiveEntitlement(ci),
        entitlements: ci?.entitlements?.active
      });
      setInfo(ci);
    });

    return () => {
      alive = false;
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    };
  }, [profile, loadingProfile, isHairdresser, isClient, trialExpired]);

  const entitlementActive = useMemo(
    () => hasActiveEntitlement(info),
    [info]
  );

  const shouldShowPaywall = useMemo(() => {
    if (!profile || loadingProfile) return false;
    if (isHairdresser) return false;
    if (!trialExpired) return false;
    
    // Wait for initial check to complete before making decisions
    if (!initialCheckComplete) return false;
    
    // Only show paywall if we've checked and confirmed no active entitlement
    return !entitlementActive;
  }, [
    profile,
    loadingProfile,
    isHairdresser,
    trialExpired,
    initialCheckComplete,
    entitlementActive,
  ]);

  return {
    shouldShowPaywall,
    loading: checking || !initialCheckComplete, // Loading until initial check is complete
    entitlementActive,
    isBetaTester,
    trialEndsAt: trialEndsAt.toISOString(),
    trialExpired,
  };
}