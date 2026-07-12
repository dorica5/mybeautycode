import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  APP_LOCALES,
  defaultAppLocale,
  isAppLocale,
  LOCALE_STORAGE_KEY,
  translate,
  type AppLocale,
} from "@/src/i18n";
import { coerceProfessionCode } from "@/src/constants/professionCodes";
import type { AccountSurfaceRow } from "@/src/lib/linkedAccountsStorage";

type LanguageContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: Record<string, string>) => string;
  ready: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<AppLocale>(defaultAppLocale());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        if (!cancelled && isAppLocale(stored)) {
          setLocaleState(stored);
        }
      } catch {
        /* keep device default */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    if (!APP_LOCALES.includes(next)) return;
    setLocaleState(next);
    void AsyncStorage.setItem(LOCALE_STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string>) =>
      translate(locale, key, params),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, ready }),
    [locale, setLocale, t, ready]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return ctx;
}

/** Translated salon / barbershop label for professional profile menus. */
export function useEstablishmentNoun(
  code: string | null | undefined,
  variant: "title" | "lower" = "title"
): string {
  const { t } = useI18n();
  const isBarber = code === "barber";
  if (variant === "lower") {
    return isBarber
      ? t("establishment.barbershopLower")
      : t("establishment.salonLower");
  }
  return isBarber ? t("establishment.barbershop") : t("establishment.salon");
}

/** Translated profession tile / filter label. */
export function professionLabelFromT(
  t: (key: string, params?: Record<string, string>) => string,
  code: string | null | undefined
): string {
  const c = coerceProfessionCode(code ?? undefined);
  switch (c) {
    case "hair":
      return t("profession.hair");
    case "barber":
      return t("profession.barber");
    case "nails":
      return t("profession.nails");
    case "brows_lashes":
      return t("profession.brows");
    case "esthetician":
      return t("profession.esthetician");
    default:
      return t("profession.roleProfessional");
  }
}

/** Translated role line on Switch account / My accounts rows. */
export function accountSurfaceRoleLabel(
  t: (key: string, params?: Record<string, string>) => string,
  row: Pick<AccountSurfaceRow, "surface" | "professionCode">
): string {
  if (row.surface === "client") return t("profile.accountRoleClient");
  if (row.professionCode) return professionLabelFromT(t, row.professionCode);
  return t("profile.accountRoleProfessional");
}

/** Subtitle under pro home title (e.g. “Frisørkonto”). */
export function professionAccountLabelFromT(
  t: (key: string, params?: Record<string, string>) => string,
  code: string | null | undefined
): string {
  const c = coerceProfessionCode(code ?? undefined);
  switch (c) {
    case "hair":
      return t("profession.accountHair");
    case "barber":
      return t("profession.accountBarber");
    case "nails":
      return t("profession.accountNails");
    case "brows_lashes":
      return t("profession.accountBrows");
    case "esthetician":
      return t("profession.accountEsthetician");
    default:
      return t("profession.accountProfessional");
  }
}

export function visitDateLocaleTag(locale: AppLocale): string {
  switch (locale) {
    case "nb":
      return "nb-NO";
    case "da":
      return "da-DK";
    case "sv":
      return "sv-SE";
    default:
      return "en-GB";
  }
}

/** Long visit list date (e.g. 15. juni 2026 / 15 June 2026). */
export function formatVisitListDateForLocale(
  locale: AppLocale,
  createdAt: string
): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(visitDateLocaleTag(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Translated profession tile / filter label. */
export function useProfessionLabel(
  code: string | null | undefined
): string {
  const { t } = useI18n();
  return professionLabelFromT(t, code);
}

/** Translated role noun for notification sentences (lowercase). */
export function useProfessionRoleLabel(
  code: string | null | undefined
): string {
  const { t } = useI18n();
  const c = coerceProfessionCode(code ?? undefined);
  switch (c) {
    case "hair":
      return t("profession.roleHair");
    case "barber":
      return t("profession.roleBarber");
    case "nails":
      return t("profession.roleNails");
    case "brows_lashes":
      return t("profession.roleBrows");
    default:
      return t("profession.roleProfessional");
  }
}

export default LanguageProvider;
