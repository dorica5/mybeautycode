/**
 * Parse / serialize `profiles.social_media` for one or more URLs (Get discovered).
 * Backward compatible: a single plain URL is stored as-is; multiple JSON `{ "links": [...] }`.
 */

import { inferSocialFromUrl } from "./inferSocialFromUrl";

export function parseSocialLinks(raw: string | null | undefined): string[] {
  if (raw == null) return [];
  const t = String(raw).trim();
  if (!t) return [];

  if (t.startsWith("{")) {
    try {
      const o = JSON.parse(t) as { links?: unknown };
      if (o && Array.isArray(o.links)) {
        return o.links.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      }
    } catch {
      /* fall through */
    }
  }

  if (t.startsWith("[")) {
    try {
      const a = JSON.parse(t) as unknown;
      if (Array.isArray(a)) {
        return a.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      }
    } catch {
      /* fall through */
    }
  }

  return [t];
}

export function serializeSocialLinks(links: string[]): string {
  const cleaned = links.map((l) => l.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0];
  return JSON.stringify({ links: cleaned });
}

/** First URL suitable for `OpenUrl` / deep links; supports legacy plain string or JSON. */
export function primarySocialUrl(raw: string | null | undefined): string | null {
  const links = parseSocialLinks(raw);
  return links[0]?.trim() || null;
}

/** Non-empty if profile has at least one social URL (including JSON). */
export function socialMediaHasLinks(raw: string | null | undefined): boolean {
  return parseSocialLinks(raw).length > 0;
}

/**
 * Stable row title for a saved URL — prefers inferred label; keeps multiple distinct rows readable.
 */
export function socialLinkRowLabel(url: string): string {
  return inferSocialFromUrl(url).label;
}
