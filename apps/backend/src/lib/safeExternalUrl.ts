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

function hasControlChars(value: string): boolean {
  return /[\u0000-\u001F\u007F]/.test(value);
}

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

export function validateExternalUrl(raw: string): { ok: true; normalized: string } | { ok: false } {
  const url = normalizeExternalUrlInput(raw);
  if (!url) return { ok: false };
  return { ok: true, normalized: url.toString() };
}

function parseSocialLinkStrings(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];

  if (t.startsWith("{")) {
    try {
      const o = JSON.parse(t) as { links?: unknown };
      if (o && Array.isArray(o.links)) {
        return o.links.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0
        );
      }
    } catch {
      /* fall through */
    }
  }

  if (t.startsWith("[")) {
    try {
      const a = JSON.parse(t) as unknown;
      if (Array.isArray(a)) {
        return a.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0
        );
      }
    } catch {
      /* fall through */
    }
  }

  return [t];
}

function serializeSocialLinkStrings(links: string[]): string {
  const cleaned = links.map((l) => l.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0];
  return JSON.stringify({ links: cleaned });
}

/** Strip unsafe links from stored social JSON; used when serving legacy rows. */
export function sanitizeSocialMediaForStorage(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const safe: string[] = [];
  for (const link of parseSocialLinkStrings(trimmed)) {
    const v = validateExternalUrl(link);
    if (v.ok) safe.push(v.normalized);
  }
  const serialized = serializeSocialLinkStrings(safe);
  return serialized || null;
}

export function assertSafeBookingSite(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") {
    throw Object.assign(new Error("Booking site must be a URL string."), {
      statusCode: 400 as const,
    });
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const v = validateExternalUrl(trimmed);
  if (!v.ok) {
    throw Object.assign(
      new Error("Booking site must be a safe http or https URL."),
      { statusCode: 400 as const }
    );
  }
  return v.normalized;
}

/** Strip unsafe booking URLs when serving stored profile data. */
export function safeBookingSiteForRead(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const v = validateExternalUrl(trimmed);
  return v.ok ? v.normalized : null;
}

export function assertSafeSocialMedia(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") {
    throw Object.assign(new Error("Social links must be URLs."), {
      statusCode: 400 as const,
    });
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const links = parseSocialLinkStrings(trimmed);
  const safe: string[] = [];
  for (const link of links) {
    const v = validateExternalUrl(link);
    if (!v.ok) {
      throw Object.assign(
        new Error("Social links must be safe http or https URLs."),
        { statusCode: 400 as const }
      );
    }
    safe.push(v.normalized);
  }
  return serializeSocialLinkStrings(safe) || null;
}
