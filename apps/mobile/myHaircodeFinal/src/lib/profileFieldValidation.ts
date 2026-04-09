import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

/** Matches API `profileService` username rules. */
export const USERNAME_MAX_LEN = 30;
export const USERNAME_RE = /^[a-z][a-z0-9_]{2,29}$/;

export function sanitizeUsername(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, USERNAME_MAX_LEN);
}

export function validateUsernameInput(raw: string): {
  ok: true;
  value: string;
} | { ok: false; message: string } {
  const v = sanitizeUsername(raw);
  if (!v) {
    return {
      ok: false,
      message: "Enter a username (3–30 characters, letter first).",
    };
  }
  if (!USERNAME_RE.test(v)) {
    return {
      ok: false,
      message:
        "Lowercase letters, digits, underscore only; must start with a letter.",
    };
  }
  return { ok: true, value: v };
}

/** First / last name (setup + profile editors). */
export const PERSON_NAME_RE =
  /^[a-zA-ZÀ-ÿæøåÆØÅ.\s'’-]{2,50}$/;

export function validatePersonName(
  raw: string,
  which: "first" | "last"
): { ok: true; value: string } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      message:
        which === "first"
          ? "Please enter your first name."
          : "Please enter your last name.",
    };
  }
  if (!PERSON_NAME_RE.test(trimmed)) {
    return {
      ok: false,
      message:
        "Use only letters, spaces, hyphens, apostrophes, and dots (2–50 characters).",
    };
  }
  return { ok: true, value: trimmed };
}

/** Salon / business display name on professional profile. */
export const SALON_BUSINESS_NAME_RE = /^[a-zA-ZæøåÆØÅ\s'-]{2,50}$/;

export function validateSalonBusinessName(raw: string): {
  ok: true;
  value: string;
} | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: "Please enter a valid name (2–50 letters)." };
  }
  if (!SALON_BUSINESS_NAME_RE.test(trimmed)) {
    return { ok: false, message: "Please enter a valid name (2–50 letters)." };
  }
  return { ok: true, value: trimmed };
}

export type ParsedProfilePhone =
  | { ok: true; e164: string; country: string }
  | { ok: false; message: string };

/**
 * Parse personal `Profile.phoneNumber` or professional `businessNumber`.
 * If `raw` has no country calling code, `defaultCountry` must be a 2-letter ISO code.
 */
export function parseProfilePhone(
  raw: string,
  defaultCountry?: string | null
): ParsedProfilePhone {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter a phone number." };
  }

  let parsed = parsePhoneNumberFromString(trimmed);
  const iso =
    typeof defaultCountry === "string" && /^[A-Z]{2}$/i.test(defaultCountry)
      ? (defaultCountry.trim().toUpperCase() as CountryCode)
      : undefined;

  if ((!parsed || !parsed.isValid()) && iso) {
    parsed = parsePhoneNumberFromString(trimmed, iso) ?? undefined;
  }

  if (!parsed || !parsed.isValid()) {
    return {
      ok: false,
      message: iso
        ? "Enter a valid number with country code (e.g. +47…), or a national number for your country."
        : "Enter a valid number with country code (e.g. +47…). Set your country in profile (personal details) to use a national number without +.",
    };
  }

  const country = parsed.country ?? iso ?? "UNKNOWN";
  return {
    ok: true,
    e164: parsed.format("E.164"),
    country,
  };
}
