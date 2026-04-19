import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { Profile } from "@/src/constants/types";
import {
  coerceProfessionCode,
  pickActiveProfessionCode,
  professionHomeAccountLabel,
} from "@/src/constants/professionCodes";
import {
  getLastProfessionCode,
  setLastProfessionCode,
} from "@/src/lib/lastVisitPreference";

/**
 * AsyncStorage-backed “active profession” for multi-role pros (same login, one professional_profile_id).
 * Used for visits, Get discovered, and PATCH targets on `professional_professions` rows.
 */
export function useActiveProfessionState(profile: Profile | null | undefined) {
  const professionCodesFromProfile =
    profile?.profession_codes ??
    (profile as { professionCodes?: string[] } | null | undefined)
      ?.professionCodes;

  const professionCodesKey = useMemo(
    () => professionCodesFromProfile?.join(",") ?? "",
    [professionCodesFromProfile]
  );

  const [storedProfession, setStoredProfession] = useState<
    string | null | undefined
  >(undefined);

  const reloadStoredProfession = useCallback(() => {
    const uid = profile?.id;
    if (!uid) return;
    void getLastProfessionCode(uid).then(setStoredProfession);
  }, [profile?.id]);

  useEffect(() => {
    reloadStoredProfession();
  }, [reloadStoredProfession, professionCodesKey]);

  useFocusEffect(
    useCallback(() => {
      reloadStoredProfession();
    }, [reloadStoredProfession])
  );

  const storedProfessionReady = storedProfession !== undefined;

  const activeProfessionCode = useMemo(() => {
    if (storedProfession === undefined) return null;
    return pickActiveProfessionCode(
      professionCodesFromProfile,
      storedProfession ?? undefined
    );
  }, [professionCodesFromProfile, storedProfession]);

  const professionLine = useMemo(() => {
    if (storedProfession === undefined) return "Professional account";
    const codes = professionCodesFromProfile;
    const firstListRaw =
      codes?.find((c: string) => coerceProfessionCode(c) != null) ??
      codes?.[0];
    return professionHomeAccountLabel(activeProfessionCode, firstListRaw);
  }, [storedProfession, activeProfessionCode, professionCodesFromProfile]);

  useEffect(() => {
    if (storedProfession === undefined || !profile?.id) return;
    const uid = profile.id;
    const codes = professionCodesFromProfile;
    const picked = pickActiveProfessionCode(codes, storedProfession ?? undefined);
    const firstListRaw =
      codes?.find((c: string) => coerceProfessionCode(c) != null) ??
      codes?.[0];
    const codeToStore =
      picked ??
      coerceProfessionCode(firstListRaw ?? undefined) ??
      coerceProfessionCode(storedProfession ?? undefined);
    if (codeToStore) {
      void setLastProfessionCode(uid, codeToStore);
    }
  }, [
    profile?.id,
    professionCodesKey,
    storedProfession,
    professionCodesFromProfile,
  ]);

  return {
    storedProfessionReady,
    activeProfessionCode,
    professionLine,
    professionCodesFromProfile,
  };
}
