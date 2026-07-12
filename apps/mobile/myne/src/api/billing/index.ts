import { api } from "@/src/lib/apiClient";
import type { ProBillingStatus } from "@/src/constants/billingConfig";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/providers/AuthProvider";
import { profileHasProfessionalCapability } from "@/src/constants/professionCodes";

export const billingQueryKey = ["pro_billing_status"] as const;

export async function fetchProBillingStatus(): Promise<ProBillingStatus> {
  return api.get<ProBillingStatus>("/api/billing/status");
}

export async function syncProEntitlement(input: {
  entitlementActive: boolean;
  entitlementExpiresAt?: string | null;
  plan?: string | null;
  revenueCatAppUserId?: string | null;
}): Promise<ProBillingStatus> {
  return api.post<ProBillingStatus>("/api/billing/sync-entitlement", input);
}

export function useProBillingStatus(enabled = true) {
  const { profile } = useAuth();
  const isPro = profileHasProfessionalCapability(profile);

  return useQuery({
    queryKey: billingQueryKey,
    queryFn: fetchProBillingStatus,
    enabled: enabled && Boolean(profile?.id) && isPro,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useInvalidateProBilling() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: billingQueryKey });
}
