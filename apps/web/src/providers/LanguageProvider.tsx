"use client";

import {
  DEFAULT_SITE_LANGUAGE,
  isSiteLanguageCode,
  type SiteLanguageCode,
} from "@/lib/languages";
import {
  getSiteTranslations,
  type SiteTranslations,
} from "@/lib/i18n/siteTranslations";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "myne-site-language";

type LanguageContextValue = {
  language: SiteLanguageCode;
  setLanguage: (code: SiteLanguageCode) => void;
  t: SiteTranslations;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SiteLanguageCode>(
    DEFAULT_SITE_LANGUAGE
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isSiteLanguageCode(stored)) {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = useCallback((code: SiteLanguageCode) => {
    setLanguageState(code);
    window.localStorage.setItem(STORAGE_KEY, code);
    document.documentElement.lang = code === "nb" ? "nb" : code;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "nb" ? "nb" : language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: getSiteTranslations(language),
    }),
    [language, setLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useSiteLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useSiteLanguage must be used within LanguageProvider");
  }
  return ctx;
}
