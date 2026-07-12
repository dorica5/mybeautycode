import { useEffect } from "react";
import { router } from "expo-router";
import {
  useVisitLimitGate,
  type VisitBillingAction,
} from "@/src/hooks/useVisitLimitGate";

/** Redirect pros away from visit screens when over the free visit limit. */
export function useVisitScreenGate(action: VisitBillingAction) {
  const { blocked, loading, guard } = useVisitLimitGate(action);

  useEffect(() => {
    if (loading || !blocked) return;
    const allowed = guard();
    if (!allowed) {
      const t = setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/(professional)/(tabs)/home");
      }, 100);
      return () => clearTimeout(t);
    }
  }, [blocked, loading, guard]);

  return { blocked, loading };
}
