import { api } from "@/src/lib/apiClient";

export type ProfessionalAnalyticsEvent =
  | "profile_view"
  | "booking_click"
  | "social_click";

export type ProfessionalAnalyticsStats = {
  profileViewCount: number;
  bookingClickCount: number;
  socialClickCount: number;
};

/**
 * Fire-and-forget engagement tracking for a public professional profile (per profession lane).
 * No-ops safely if unauthenticated (API returns 401 — caller should ignore).
 */
export function recordProfessionalAnalyticsEvent(params: {
  subjectProfileId: string;
  professionCode: string | null | undefined;
  event: ProfessionalAnalyticsEvent;
}): Promise<void> {
  const { subjectProfileId, professionCode, event } = params;
  const body: {
    subject_profile_id: string;
    event: ProfessionalAnalyticsEvent;
    profession_code?: string;
  } = {
    subject_profile_id: subjectProfileId,
    event,
  };
  const code = professionCode?.trim();
  if (code) body.profession_code = code;
  return api
    .post<{ recorded: boolean }>("/api/professional-analytics/events", body)
    .then(() => undefined)
    .catch(() => undefined);
}

export async function fetchMyProfessionalAnalytics(
  professionCode: string | null | undefined
): Promise<ProfessionalAnalyticsStats> {
  const params = new URLSearchParams();
  const code = professionCode?.trim();
  if (code) params.set("profession_code", code);
  const qs = params.toString();
  return api.get<ProfessionalAnalyticsStats>(
    `/api/professional-analytics/me${qs ? `?${qs}` : ""}`
  );
}
