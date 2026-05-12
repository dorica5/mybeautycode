import { api } from "@/src/lib/apiClient";

import type { SocialKind } from "@/src/lib/inferSocialFromUrl";

export type ProfessionalAnalyticsEvent =
  | "profile_view"
  | "booking_click"
  | "social_click";

export type ProfessionalAnalyticsStats = {
  profileViewCount: number;
  bookingClickCount: number;
  socialClickCount: number;
  /** Keys match `SocialKind` (instagram, tiktok, x, …). */
  socialClickCounts: Record<string, number>;
};

/**
 * Fire-and-forget engagement tracking for a public professional profile (per profession lane).
 * No-ops safely if unauthenticated (API returns 401 — caller should ignore).
 */
export function recordProfessionalAnalyticsEvent(params: {
  subjectProfileId: string;
  professionCode: string | null | undefined;
  event: ProfessionalAnalyticsEvent;
  /** Required for meaningful breakdown when event is social_click */
  socialPlatform?: SocialKind;
}): Promise<void> {
  const { subjectProfileId, professionCode, event, socialPlatform } = params;
  const body: {
    subject_profile_id: string;
    event: ProfessionalAnalyticsEvent;
    profession_code?: string;
    social_platform?: string;
  } = {
    subject_profile_id: subjectProfileId,
    event,
  };
  const code = professionCode?.trim();
  if (code) body.profession_code = code;
  if (event === "social_click" && socialPlatform) {
    body.social_platform = socialPlatform;
  }
  return api
    .post<{ recorded: boolean }>("/api/professional-analytics/events", body)
    .then(() => undefined)
    .catch(() => undefined);
}

function readInt(o: Record<string, unknown>, camel: string, snake: string): number {
  const raw = o[camel] ?? o[snake];
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function readSocialClickCounts(raw: unknown): Record<string, number> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(o)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out[k] = Math.trunc(n);
  }
  return out;
}

/** Normalize GET payload (camelCase or snake_case). */
function normalizeProfessionalAnalyticsStats(raw: unknown): ProfessionalAnalyticsStats {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    profileViewCount: readInt(o, "profileViewCount", "profile_view_count"),
    bookingClickCount: readInt(o, "bookingClickCount", "booking_click_count"),
    socialClickCount: readInt(o, "socialClickCount", "social_click_count"),
    socialClickCounts: readSocialClickCounts(
      o.socialClickCounts ?? o.social_click_counts
    ),
  };
}

export async function fetchMyProfessionalAnalytics(
  professionCode: string | null | undefined
): Promise<ProfessionalAnalyticsStats> {
  const params = new URLSearchParams();
  const code = professionCode?.trim();
  if (code) params.set("profession_code", code);
  const qs = params.toString();
  const raw = await api.get<unknown>(
    `/api/professional-analytics/me${qs ? `?${qs}` : ""}`
  );
  return normalizeProfessionalAnalyticsStats(raw);
}
