export const SITE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "nb", label: "Norsk" },
  { code: "sv", label: "Svenska" },
  { code: "da", label: "Dansk" },
] as const;

export type SiteLanguageCode = (typeof SITE_LANGUAGES)[number]["code"];

export const DEFAULT_SITE_LANGUAGE: SiteLanguageCode = "en";

export function isSiteLanguageCode(value: string): value is SiteLanguageCode {
  return SITE_LANGUAGES.some((lang) => lang.code === value);
}
