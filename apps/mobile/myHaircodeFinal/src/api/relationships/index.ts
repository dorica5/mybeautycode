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
