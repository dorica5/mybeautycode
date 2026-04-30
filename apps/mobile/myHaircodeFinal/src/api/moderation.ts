import { api } from "@/src/lib/apiClient";
import { useQuery } from "@tanstack/react-query";

export const REPORT_REASONS = [
  { value: "spam_fake", label: "Spam or fake profile", severity: "medium" },
  {
    value: "inappropriate_content",
    label: "Inappropriate content",
    severity: "high",
  },
  { value: "harassment", label: "Harassment or bullying", severity: "high" },
  {
    value: "unprofessional",
    label: "Unprofessional behavior",
    severity: "medium",
  },
  { value: "other", label: "Other", severity: "low" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const getUserModerationStatus = async (userId: string) => {
  const status = await api.get<{
    isBanned: boolean;
    isRestricted: boolean;
    strikeCount: number;
    totalReports: number;
    banReason?: string;
    status: string;
  }>(`/api/moderation/status?user_id=${encodeURIComponent(userId)}`);
  return status;
};

export const reportUserEnhanced = async (
  reporter_id: string,
  reported_id: string,
  reason: ReportReason,
  additionalDetails?: string,
  queryClient?: { invalidateQueries: (opts: unknown) => void }
) => {
  const result = await api.post<{
    success: boolean;
    totalReports: number;
    userStatus: string;
  }>("/api/moderation/report", {
    reported_id,
    reason: REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason,
    additional_details: additionalDetails,
  });
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ["latest_visits", reporter_id] });
    queryClient.invalidateQueries({ queryKey: ["latest_visits", reported_id] });
  }
  return {
    ...result,
    reportCount: result.totalReports,
    message: "User reported successfully",
  };
};

export const blockUser = async (
  blocker_id: string,
  blocked_id: string,
  reason: string,
  queryClient?: { invalidateQueries: (opts: unknown) => void }
) => {
  await api.post("/api/moderation/block", { blocked_id, reason });
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ["latest_visits", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["latest_visits", blocked_id] });
    queryClient.invalidateQueries({ queryKey: ["relationship"] });
    queryClient.invalidateQueries({ queryKey: ["listAllClientSearch", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["listAllClientSearch", blocked_id] });
    queryClient.invalidateQueries({ queryKey: ["client_visits", blocked_id] });
    queryClient.invalidateQueries({ queryKey: ["client_visits", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["moderation", "blockedIdList"] });
  }
  return { success: true };
};

/** After unblock, server clears `client_professional_links` — use for success alerts. */
export const UNBLOCK_RELATIONSHIP_RESET_ALERT = {
  title: "Unblocked",
  message:
    "The block is removed. Your client link was ended — use Add client or a link request if you want to work together again.",
} as const;

export const unblockUser = async (
  blocker_id: string,
  blocked_id: string,
  queryClient?: { invalidateQueries: (opts: unknown) => void }
) => {
  await api.post("/api/moderation/unblock", { blocked_id });
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ["latest_visits", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["latest_visits", blocked_id] });
    queryClient.invalidateQueries({ queryKey: ["relationship"] });
    queryClient.invalidateQueries({ queryKey: ["listAllClientSearch", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["listAllClientSearch", blocked_id] });
    queryClient.invalidateQueries({ queryKey: ["client_visits", blocked_id] });
    queryClient.invalidateQueries({ queryKey: ["client_visits", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["moderation", "blockedIdList"] });
  }
  return { success: true };
};

export const canUserPerformAction = async (userId: string) => {
  const status = await getUserModerationStatus(userId);
  return {
    allowed: !status.isBanned && !status.isRestricted,
    reason: status.isBanned
      ? "Your account has been permanently banned."
      : status.isRestricted
      ? "Your account is currently restricted."
      : undefined,
  };
};

export const blockedIds = async (_blocker_id: string) => {
  return api.get<string[]>("/api/moderation/blocked-ids");
};

export const allBlockerIds = async (blocked_id: string) => {
  return api.get<string[]>(
    `/api/moderation/blocker-ids?blocked_id=${encodeURIComponent(blocked_id)}`
  );
};

export const isBlocked = async (profile_id: string, blocked_id: string) => {
  const ids = await blockedIds(profile_id);
  return ids.includes(blocked_id);
};

/** One fetch per client for “who I blocked” — reuse instead of re-fetching per profile open. */
export const blockedIdListQueryKey = (clientId: string) =>
  ["moderation", "blockedIdList", clientId] as const;

export function useBlockedIdList(clientId: string | undefined) {
  return useQuery({
    queryKey: blockedIdListQueryKey(clientId ?? ""),
    queryFn: () => blockedIds(clientId!),
    enabled: Boolean(clientId),
    staleTime: 120_000,
  });
}
