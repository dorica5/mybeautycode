import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { Profile } from "@/src/constants/types";
import {
  coerceProfessionCode,
  pickActiveProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import {
  getLastProfessionCode,
  getSessionProfessionPin,
  pinSessionProfessionCode,
  setLastProfessionCode,
} from "@/src/lib/lastVisitPreference";
import {
  professionAccountLabelFromT,
  useI18n,
} from "@/src/providers/LanguageProvider";

/**
 * AsyncStorage-backed “active profession” for multi-role pros (same login, one professional_profile_id).
 * Used for visits, Get discovered, and PATCH targets on `professional_professions` rows.
 */
export function useActiveProfessionState(profile: Profile | null | undefined) {
  const { t } = useI18n();
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
    void getLastProfessionCode(uid).then((stored) => {
      setStoredProfession(stored);
      if (stored?.trim() && getSessionProfessionPin() == null) {
        pinSessionProfessionCode(stored);
      }
    });
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
    const pinned = getSessionProfessionPin();
    return pickActiveProfessionCode(
      professionCodesFromProfile,
      pinned ?? storedProfession ?? undefined
    );
  }, [professionCodesFromProfile, storedProfession]);

  const professionLine = useMemo(() => {
    if (storedProfession === undefined) return t("profession.accountProfessional");
    const codes = professionCodesFromProfile;
    const firstListRaw =
      codes?.find((c: string) => coerceProfessionCode(c) != null) ??
      codes?.[0];
    const code =
      activeProfessionCode ??
      coerceProfessionCode(firstListRaw ?? undefined);
    return professionAccountLabelFromT(t, code);
  }, [storedProfession, activeProfessionCode, professionCodesFromProfile, t]);

  /** Persist explicit profession choice — call when user switches account or saves lane-scoped data. */
  const commitActiveProfession = useCallback(
    async (code: ProfessionChoiceCode) => {
      const uid = profile?.id;
      if (!uid) return;
      pinSessionProfessionCode(code);
      setStoredProfession(code);
      await setLastProfessionCode(uid, code);
    },
    [profile?.id]
  );

  return {
    storedProfessionReady,
    activeProfessionCode,
    professionLine,
    professionCodesFromProfile,
    commitActiveProfession,
  };
}
