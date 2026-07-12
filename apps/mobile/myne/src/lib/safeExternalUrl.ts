/** User-facing profile links — http(s) only; block script/data and other schemes. */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const BLOCKED_SCHEME_PREFIXES = [
  "javascript:",
  "data:",
  "file:",
  "vbscript:",
  "blob:",
  "intent:",
  "market:",
  "itms:",
  "itms-apps:",
];

export type ExternalUrlValidation =
  | { ok: true; normalized: string }
  | { ok: false; blocked: boolean };

function hasControlChars(value: string): boolean {
  return /[\u0000-\u001F\u007F]/.test(value);
}

/**
 * Parse and normalize a user-supplied web URL. Returns null when invalid or disallowed.
 */
export function normalizeExternalUrlInput(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed || hasControlChars(trimmed)) return null;

  const lower = trimmed.toLowerCase();
  if (BLOCKED_SCHEME_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return null;
  }

  const toParse = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(toParse);
    const protocol = url.protocol.toLowerCase();
    if (!ALLOWED_PROTOCOLS.has(protocol)) return null;
    if (!url.hostname.trim()) return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function validateExternalUrl(raw: string): ExternalUrlValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, blocked: false };
  }
  const lower = trimmed.toLowerCase();
  const blocked = BLOCKED_SCHEME_PREFIXES.some((prefix) =>
    lower.startsWith(prefix)
  );
  const url = normalizeExternalUrlInput(trimmed);
  if (!url) {
    return { ok: false, blocked };
  }
  return { ok: true, normalized: url.toString() };
}

export function isSafeExternalUrl(raw: string | null | undefined): boolean {
  if (raw == null || !String(raw).trim()) return false;
  return validateExternalUrl(String(raw)).ok;
}

/** Safe https URL string for storage/display, or null. */
export function normalizeExternalUrlString(raw: string): string | null {
  const result = validateExternalUrl(raw);
  return result.ok ? result.normalized : null;
}

export function sanitizeSocialLinkList(links: string[]): string[] {
  const out: string[] = [];
  for (const link of links) {
    const result = validateExternalUrl(link);
    if (result.ok) out.push(result.normalized);
  }
  return out;
}
