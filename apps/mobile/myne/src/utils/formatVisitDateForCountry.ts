/**
 * Maps ISO 3166-1 alpha-2 (as stored on `profile.country`) to a BCP 47 locale
 * for short calendar dates. One locale per territory is a best-effort default when
 * the app only knows the country, not the user's language.
 */
const ISO2_TO_LOCALE: Record<string, string> = {
  US: "en-US",
  CA: "en-CA",
  MX: "es-MX",
  GB: "en-GB",
  IE: "en-IE",
  NO: "nb-NO",
  SE: "sv-SE",
  DK: "da-DK",
  FI: "fi-FI",
  IS: "is-IS",
  DE: "de-DE",
  AT: "de-AT",
  CH: "de-CH",
  FR: "fr-FR",
  BE: "nl-BE",
  NL: "nl-NL",
  LU: "fr-LU",
  ES: "es-ES",
  PT: "pt-PT",
  BR: "pt-BR",
  IT: "it-IT",
  PL: "pl-PL",
  CZ: "cs-CZ",
  SK: "sk-SK",
  HU: "hu-HU",
  RO: "ro-RO",
  BG: "bg-BG",
  HR: "hr-HR",
  SI: "sl-SI",
  EE: "et-EE",
  LV: "lv-LV",
  LT: "lt-LT",
  GR: "el-GR",
  CY: "el-CY",
  MT: "mt-MT",
  JP: "ja-JP",
  KR: "ko-KR",
  CN: "zh-CN",
  TW: "zh-TW",
  HK: "zh-HK",
  SG: "en-SG",
  MY: "ms-MY",
  TH: "th-TH",
  VN: "vi-VN",
  PH: "en-PH",
  ID: "id-ID",
  IN: "en-IN",
  AU: "en-AU",
  NZ: "en-NZ",
  ZA: "en-ZA",
  AR: "es-AR",
  CL: "es-CL",
  CO: "es-CO",
  AE: "ar-AE",
  SA: "ar-SA",
  IL: "he-IL",
  TR: "tr-TR",
  UA: "uk-UA",
  RU: "ru-RU",
  EG: "ar-EG",
  NG: "en-NG",
  KE: "en-KE",
};

function resolveLocale(countryIso2?: string | null): string {
  const code = countryIso2?.trim().toUpperCase();
  if (code && ISO2_TO_LOCALE[code]) {
    return ISO2_TO_LOCALE[code]!;
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return "en-GB";
  }
}

/**
 * Short locale-appropriate date (e.g. US: M/D/YY, many EU: D/M/YY or localized separators).
 */
export function formatVisitDateForCountry(
  date: Date,
  countryIso2?: string | null
): string {
  const locale = resolveLocale(countryIso2);
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "short" }).format(date);
  }
}
