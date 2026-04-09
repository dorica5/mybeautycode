import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/providers/AuthProvider";
import {
  coerceProfessionCode,
  pickActiveProfessionCode,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { getLastProfessionCode } from "@/src/lib/lastVisitPreference";

/**
 * Resolves which profession code to use for client visit list / gallery API calls.
 * For multi-profession accounts, waits for {@link getLastProfessionCode} so we never
 * query using the wrong surface (first row in DB sort order is often `hair`).
 */
export function useResolvedListProfessionCode(
  routeProfessionParam?: string | string[]
): { code: ProfessionChoiceCode; ready: boolean } {
  const { profile } = useAuth();
  const professionCodesFromProfile =
    profile?.profession_codes ??
    (profile as { professionCodes?: string[] | null })?.professionCodes;

  const normalizedProCodes = useMemo(() => {
    const out: ProfessionChoiceCode[] = [];
    for (const c of professionCodesFromProfile ?? []) {
      const n = coerceProfessionCode(c);
      if (n && !out.includes(n)) out.push(n);
    }
    return out;
  }, [professionCodesFromProfile]);

  const proCodesKey = useMemo(() => normalizedProCodes.join(","), [normalizedProCodes]);

  const needsLastVisitPref = normalizedProCodes.length > 1;

  const [lastProfessionCode, setLastProfessionCode] = useState<string | null>(
    null
  );
  const [multiLastLoaded, setMultiLastLoaded] = useState(false);

  useEffect(() => {
    const uid = profile?.id;
    if (!uid) {
      setLastProfessionCode(null);
      setMultiLastLoaded(false);
      return;
    }
    if (normalizedProCodes.length <= 1) {
      setLastProfessionCode(null);
      setMultiLastLoaded(true);
      return;
    }
    setMultiLastLoaded(false);
    let cancelled = false;
    void getLastProfessionCode(uid).then((last) => {
      if (!cancelled) {
        setLastProfessionCode(last);
        setMultiLastLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, proCodesKey]);

  const pickedFromProfile = useMemo(
    () =>
      pickActiveProfessionCode(
        professionCodesFromProfile,
        lastProfessionCode
      ),
    [professionCodesFromProfile, lastProfessionCode]
  );

  const ready = Boolean(
    profile?.id &&
      normalizedProCodes.length > 0 &&
      (!needsLastVisitPref || multiLastLoaded)
  );

  const code = useMemo((): ProfessionChoiceCode => {
    const raw = Array.isArray(routeProfessionParam)
      ? routeProfessionParam[0]
      : routeProfessionParam;
    const fromParam = coerceProfessionCode(
      typeof raw === "string" ? raw : undefined
    );
    if (normalizedProCodes.length > 0) {
      if (fromParam && normalizedProCodes.includes(fromParam)) {
        return fromParam;
      }
      return (pickedFromProfile ?? "hair") as ProfessionChoiceCode;
    }
    return (pickedFromProfile ?? fromParam ?? "hair") as ProfessionChoiceCode;
  }, [routeProfessionParam, normalizedProCodes, pickedFromProfile]);

  return { code, ready };
}
