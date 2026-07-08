import { api } from "@/src/lib/apiClient";
import { useQuery } from "@tanstack/react-query";
import { coerceProfessionCode } from "@/src/constants/professionCodes";

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

export type BlockedUserRow = {
  blocked_id: string;
  profession_code: string;
};

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
    reason,
    additional_details: additionalDetails,
  });
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ["latest_visits", reporter_id] });
    queryClient.invalidateQueries({ queryKey: ["latest_visits", reported_id] });
  }
  return {
    ...result,
    reportCount: result.totalReports,
    message: "report_success",
  };
};

export const blockUser = async (
  blocker_id: string,
  blocked_id: string,
  reason: string,
  professionCode: string,
  queryClient?: { invalidateQueries: (opts: unknown) => void }
) => {
  await api.post("/api/moderation/block", {
    blocked_id,
    reason,
    profession_code: professionCode,
  });
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ["latest_visits", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["latest_visits", blocked_id] });
    queryClient.invalidateQueries({ queryKey: ["relationship"] });
    queryClient.invalidateQueries({ queryKey: ["listAllClientSearch", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["listAllClientSearch", blocked_id] });
    queryClient.invalidateQueries({ queryKey: ["listAllHairdresserSearch"] });
    queryClient.invalidateQueries({ queryKey: ["salons"] });
    queryClient.invalidateQueries({ queryKey: ["client_visits", blocked_id] });
    queryClient.invalidateQueries({ queryKey: ["client_visits", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["moderation", "blockedIdList"] });
    queryClient.invalidateQueries({ queryKey: ["moderation", "blockerIdsForUser"] });
  }
  return { success: true };
};

export const unblockUser = async (
  blocker_id: string,
  blocked_id: string,
  professionCode: string,
  queryClient?: { invalidateQueries: (opts: unknown) => void }
) => {
  await api.post("/api/moderation/unblock", {
    blocked_id,
    profession_code: professionCode,
  });
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ["latest_visits", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["latest_visits", blocked_id] });
    queryClient.invalidateQueries({ queryKey: ["relationship"] });
    queryClient.invalidateQueries({ queryKey: ["listAllClientSearch", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["listAllClientSearch", blocked_id] });
    queryClient.invalidateQueries({ queryKey: ["listAllHairdresserSearch"] });
    queryClient.invalidateQueries({ queryKey: ["salons"] });
    queryClient.invalidateQueries({ queryKey: ["client_visits", blocked_id] });
    queryClient.invalidateQueries({ queryKey: ["client_visits", blocker_id] });
    queryClient.invalidateQueries({ queryKey: ["moderation", "blockedIdList"] });
    queryClient.invalidateQueries({ queryKey: ["moderation", "blockerIdsForUser"] });
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
  return api.get<BlockedUserRow[]>("/api/moderation/blocked-ids");
};

export const allBlockerIds = async (
  blocked_id: string,
  professionCode?: string | null
) => {
  const params = new URLSearchParams({
    blocked_id,
  });
  if (professionCode?.trim()) {
    params.set("profession_code", professionCode.trim());
  }
  return api.get<string[]>(`/api/moderation/blocker-ids?${params.toString()}`);
};

/** True when `blocker_id` blocked `blocked_id` on this profession lane. */
export function isBlockedOnLane(
  rows: BlockedUserRow[] | undefined,
  blocked_id: string,
  professionCode: string | null | undefined
): boolean {
  if (!rows?.length || !blocked_id || !professionCode?.trim()) return false;
  const lane = coerceProfessionCode(professionCode);
  if (!lane) return false;
  return rows.some((r) => {
    const rowLane = coerceProfessionCode(r.profession_code);
    return r.blocked_id === blocked_id && rowLane === lane;
  });
}

export const isBlocked = async (
  profile_id: string,
  blocked_id: string,
  professionCode: string
) => {
  const ids = await blockedIds(profile_id);
  return isBlockedOnLane(ids, blocked_id, professionCode);
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

/** Lane-scoped “did I block them?” — waits for lane + blocked-id list so UI does not flash Add first. */
export function useViewerBlockedTarget(
  viewerId: string | undefined,
  targetId: string | undefined,
  professionCode: string | null | undefined
) {
  const needsBlockCheck = Boolean(viewerId && targetId);
  const laneReady = Boolean(professionCode?.trim());
  const { data: blockedIdList, isFetched } = useBlockedIdList(viewerId);
  const isBlocked = isBlockedOnLane(
    blockedIdList,
    targetId ? String(targetId) : "",
    professionCode
  );
  return {
    isBlocked,
    /** False while profession lane or blocked-id list is still loading. */
    ready: !needsBlockCheck || (laneReady && isFetched),
  };
}

/** Who blocked this user (lane-scoped when `professionCode` is set). */
export const blockerIdsForUserQueryKey = (
  userId: string,
  professionCode?: string | null
) => ["moderation", "blockerIdsForUser", userId, professionCode ?? ""] as const;

export function useBlockedBySender(
  viewerId: string | undefined,
  senderId: string | undefined,
  professionCode: string | null | undefined
) {
  const needsCheck = Boolean(viewerId && senderId);
  const { data: blockerIds, isFetched } = useQuery({
    queryKey: blockerIdsForUserQueryKey(viewerId ?? "", professionCode),
    queryFn: () => allBlockerIds(viewerId!, professionCode),
    enabled: needsCheck,
    staleTime: 120_000,
  });
  const isBlockedBySender = Boolean(
    senderId &&
      blockerIds?.some((id) => String(id) === String(senderId))
  );
  return {
    isBlockedBySender,
    ready: !needsCheck || isFetched,
  };
}
