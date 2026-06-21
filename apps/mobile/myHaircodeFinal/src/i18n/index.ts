import { en, type AppLocaleMessages } from "./locales/en";
import { nb } from "./locales/nb";
import { da } from "./locales/da";
import { sv } from "./locales/sv";

export type AppLocale = "en" | "nb" | "da" | "sv";

export const APP_LOCALES: AppLocale[] = ["en", "nb", "da", "sv"];

export const LOCALE_STORAGE_KEY = "app_locale_v1";

const catalogs: Record<AppLocale, AppLocaleMessages> = { en, nb, da, sv };

export function defaultAppLocale(): AppLocale {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (tag.startsWith("nb") || tag.startsWith("no") || tag.startsWith("nn")) {
      return "nb";
    }
    if (tag.startsWith("da")) {
      return "da";
    }
    if (tag.startsWith("sv")) {
      return "sv";
    }
  } catch {
    /* ignore */
  }
  return "en";
}

function getByPath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translate(
  locale: AppLocale,
  key: string,
  params?: Record<string, string>
): string {
  let text =
    getByPath(catalogs[locale] as unknown as Record<string, unknown>, key) ??
    getByPath(catalogs.en as unknown as Record<string, unknown>, key) ??
    key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
    }
  }
  return text;
}

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "en" || value === "nb" || value === "da" || value === "sv";
}
