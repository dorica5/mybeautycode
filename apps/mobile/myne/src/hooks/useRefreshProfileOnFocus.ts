import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";

/** Refetch `/api/auth/me` when a screen gains focus — debounced to avoid tab-switch storms. */
export function useRefreshProfileOnFocus(opts?: { eager?: boolean }) {
  const { refreshProfile } = useAuth();

  useFocusEffect(
    useCallback(() => {
      void refreshProfile(
        opts?.eager ? { bypassDebounce: true } : undefined
      );
    }, [refreshProfile, opts?.eager])
  );
}
