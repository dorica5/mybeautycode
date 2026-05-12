import { api } from "@/src/lib/apiClient";
import { useQuery } from "@tanstack/react-query";

export async function checkRelationship(
  hairdresserId: string,
  clientId: string,
  professionCode?: string | null
): Promise<boolean> {
  const q = new URLSearchParams({
    hairdresser_id: hairdresserId,
    client_id: clientId,
  });
  if (professionCode?.trim()) q.set("profession_code", professionCode.trim());
  const res = await api.get<{ exists: boolean }>(
    `/api/relationships/check?${q.toString()}`
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
  clientId: string,
  professionCode?: string | null
): Promise<ClientLinkUiStatus> {
  try {
    const q = new URLSearchParams({
      hairdresser_id: hairdresserId,
      client_id: clientId,
      link_ui: "1",
    });
    if (professionCode?.trim()) q.set("profession_code", professionCode.trim());
    const res = await api.get<{
      status?: ClientLinkUiStatus;
      exists?: boolean;
    }>(`/api/relationships/check?${q.toString()}`);
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

  const exists = await checkRelationship(
    hairdresserId,
    clientId,
    professionCode
  );
  return exists ? "active" : "none";
}

export const relationshipCheckQueryKey = (
  clientId: string,
  hairdresserId: string,
  professionCode: string | null | undefined
) =>
  [
    "relationship",
    clientId,
    hairdresserId,
    professionCode ?? "unspecified",
  ] as const;

export function useRelationshipCheck(
  clientId?: string,
  hairdresserId?: string,
  professionCode?: string | null,
  options?: { enabled?: boolean; staleTime?: number }
) {
  const enabled =
    options?.enabled !== undefined
      ? options.enabled
      : Boolean(clientId && hairdresserId);
  return useQuery({
    queryKey: relationshipCheckQueryKey(
      clientId ?? "",
      hairdresserId ?? "",
      professionCode
    ),
    queryFn: () =>
      checkRelationship(hairdresserId!, clientId!, professionCode),
    enabled,
    staleTime: options?.staleTime ?? 60_000,
  });
}

export async function removeRelationship(
  hairdresserId: string,
  clientId: string,
  professionCode?: string | null
) {
  return api.delete("/api/relationships", {
    hairdresserId,
    clientId,
    ...(professionCode?.trim()
      ? { profession_code: professionCode.trim() }
      : {}),
  });
}
