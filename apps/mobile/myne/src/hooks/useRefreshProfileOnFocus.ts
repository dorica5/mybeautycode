import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";

/** Refetch `/api/auth/me` when a screen gains focus (e.g. Switch account after a new lane on another device). */
export function useRefreshProfileOnFocus() {
  const { refreshProfile } = useAuth();

  useFocusEffect(
    useCallback(() => {
      void refreshProfile({ bypassDebounce: true });
    }, [refreshProfile])
  );
}
