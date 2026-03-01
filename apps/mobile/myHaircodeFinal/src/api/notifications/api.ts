import { api } from "@/src/lib/apiClient";

export async function getFriendRequestStatus(
  senderId: string
): Promise<string | null> {
  const res = await api.get<{ status: string | null }>(
    `/api/notifications/friend-request-status?sender_id=${encodeURIComponent(senderId)}`
  );
  return res?.status ?? null;
}

export async function getNotification(id: string) {
  return api.get<{ id: string; status?: string; read?: boolean }>(
    `/api/notifications/${id}`
  );
}

export async function respondToFriendRequest(
  notificationId: string,
  accepted: boolean
) {
  return api.put(`/api/notifications/${notificationId}/respond-friend-request`, {
    accepted,
  });
}
