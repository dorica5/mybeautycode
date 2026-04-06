import { api } from "@/src/lib/apiClient";
import { useQuery } from "@tanstack/react-query";

export async function checkRelationship(
  hairdresserId: string,
  clientId: string
): Promise<boolean> {
  const res = await api.get<{ exists: boolean }>(
    `/api/relationships/check?hairdresser_id=${encodeURIComponent(hairdresserId)}&client_id=${encodeURIComponent(clientId)}`
  );
  return res?.exists ?? false;
}

export type ClientLinkUiStatus = "none" | "pending" | "active";

/**
 * Uses `GET /api/relationships/check?link_ui=1` so it works with any backend that
 * has this handler (avoids 404 on older deploys that lack `/client-link-status`).
 */
export async function getClientLinkUiStatus(
  hairdresserId: string,
  clientId: string
): Promise<ClientLinkUiStatus> {
  try {
    const res = await api.get<{
      status?: ClientLinkUiStatus;
      exists?: boolean;
    }>(
      `/api/relationships/check?hairdresser_id=${encodeURIComponent(hairdresserId)}&client_id=${encodeURIComponent(clientId)}&link_ui=1`
    );
    if (res?.status) return res.status;
    if (typeof res?.exists === "boolean") {
      return res.exists ? "active" : "none";
    }
  } catch (e) {
    const status = (e as Error & { status?: number }).status;
    if (status !== 404 && status !== undefined) {
      throw e;
    }
  }

  const exists = await checkRelationship(hairdresserId, clientId);
  return exists ? "active" : "none";
}

export function useRelationshipCheck(
  clientId?: string,
  hairdresserId?: string
) {
  return useQuery({
    queryKey: ["relationship", clientId, hairdresserId],
    queryFn: () => checkRelationship(hairdresserId!, clientId!),
    enabled: !!clientId && !!hairdresserId,
  });
}

export async function removeRelationship(
  hairdresserId: string,
  clientId: string
) {
  return api.delete("/api/relationships", {
    hairdresserId,
    clientId,
  });
}
