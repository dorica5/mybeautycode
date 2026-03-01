import { api } from "@/src/lib/apiClient";

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
  { value: "no_show", label: "No-show appointments", severity: "low" },
  { value: "scam_fraud", label: "Scam or fraud", severity: "critical" },
  {
    value: "violence_threats",
    label: "Violence or threats",
    severity: "critical",
  },
  { value: "underage", label: "Underage user", severity: "critical" },
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
    queryClient.invalidateQueries({ queryKey: ["latest_haircodes", reporter_id] });
    queryClient.invalidateQueries({ queryKey: ["latest_haircodes", reported_id] });
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
    queryClient.invalidateQueries({ queryKey: ["latest_haircodes", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["latest_haircodes", blocked_id] });
  }
  return { success: true };
};

export const unblockUser = async (
  blocker_id: string,
  blocked_id: string,
  queryClient?: { invalidateQueries: (opts: unknown) => void }
) => {
  await api.post("/api/moderation/unblock", { blocked_id });
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ["latest_haircodes", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["latest_haircodes", blocked_id] });
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
