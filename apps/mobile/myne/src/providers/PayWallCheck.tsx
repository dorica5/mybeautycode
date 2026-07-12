/**
 * @deprecated Client time-trial paywall removed — visit-based pro billing lives in BillingProvider.
 * Discovery/map remain free for all users.
 */
export function usePaywallCheck() {
  return {
    shouldShowPaywall: false,
    loading: false,
    entitlementActive: false,
    isBetaTester: false,
    trialEndsAt: null,
    trialExpired: false,
  };
}
