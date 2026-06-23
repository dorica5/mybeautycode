import { useCallback } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useBilling } from "@/src/providers/BillingProvider";
import { useI18n } from "@/src/providers/LanguageProvider";

export type VisitBillingAction = "create" | "view";

export function useVisitLimitGate(action: VisitBillingAction) {
  const { billing, loading } = useBilling();
  const { t } = useI18n();

  const blocked =
    billing != null &&
    !(action === "create" ? billing.canCreateVisit : billing.canViewVisits);

  const openPaywall = useCallback(() => {
    router.push({
      pathname: "/Screens/paywall",
      params: { from: "visit-limit" },
    });
  }, []);

  const guard = useCallback((): boolean => {
    if (loading || !billing) return true;
    if (!blocked) return true;

    Alert.alert(
      t("billing.limitReachedTitle"),
      action === "create"
        ? t("billing.limitReachedCreate", {
            limit: billing.freeVisitLimit,
          })
        : t("billing.limitReachedView", {
            limit: billing.freeVisitLimit,
          }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("billing.subscribeToContinue"),
          onPress: openPaywall,
        },
      ]
    );
    return false;
  }, [action, billing, blocked, loading, openPaywall, t]);

  return {
    billing,
    loading,
    blocked,
    guard,
    openPaywall,
  };
}
