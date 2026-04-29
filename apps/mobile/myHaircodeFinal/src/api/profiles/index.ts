import { api } from "@/src/lib/apiClient";
import { useAuth } from "@/src/providers/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { supabase } from "@/src/lib/supabase";
import { isUuid } from "@/src/utils/isUuid";

export async function requestClientLink(
  clientId: string,
  professionCode?: string | null
) {
  return api.post<{
    success: boolean;
    clientProfessionalLinkId?: string;
    alreadyPending?: boolean;
  }>("/api/relationships/request-client", {
    client_id: clientId,
    ...(professionCode?.trim()
      ? { profession_code: professionCode.trim() }
      : {}),
  });
}

export const useUpdateSupabaseProfile = () => {
  const queryClient = useQueryClient();
  const { setProfile } = useAuth();

  return useMutation({
    mutationFn: async (data: { id: string; [key: string]: unknown }) => {
      await api.put(`/api/profiles/${data.id}`, data);
      const fresh = await api.get(`/api/auth/me`);
      setProfile(fresh as never);
      return fresh;
    },
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["profiles", id] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await api.delete(`/api/users/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      return result;
    },
    onSuccess: () => {
      supabase.auth.signOut();
    },
    onError: (error) => {
      console.error("Error deleting user:", error);
    },
  });
};

export const useListClientSearch = (
  searchQuery: string,
  hairdresserId: string | null,
  professionCode?: string | null,
  /** When false, search without `professionCode` (non–hairdresser surfaces). */
  scopeProfession: boolean = true
) => {
  const code =
    professionCode && professionCode.trim() ? professionCode.trim() : null;
  return useQuery({
    queryKey: [
      "clientSearch",
      searchQuery,
      hairdresserId,
      scopeProfession ? code ?? "all" : "any",
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        q: searchQuery,
        hairdresserId: String(hairdresserId),
      });
      if (scopeProfession && code) params.set("professionCode", code);
      return api.get<unknown[]>(
        `/api/profiles/search/clients?${params.toString()}`
      );
    },
    enabled:
      !!searchQuery &&
      !!hairdresserId &&
      (!scopeProfession || code != null),
  });
};

export const useListAllClientSearch = (
  searchQuery: string,
  hairdresser_id: string | undefined,
  professionCode: string | null | undefined
) => {
  const q = searchQuery.trim();
  const code =
    professionCode && professionCode.trim() ? professionCode.trim() : null;
  return useQuery({
    queryKey: ["clientSearch", q, "all", hairdresser_id, code ?? "any"],
    queryFn: () => {
      const params = new URLSearchParams({ q });
      if (code) params.set("professionCode", code);
      return api.get<unknown[]>(
        `/api/profiles/search/clients-with-relationship?${params.toString()}`
      );
    },
    /** Same lane contract as latest visits: never call unscoped (would list unrelated profiles server-side). */
    enabled: !!hairdresser_id && q.length > 0 && !!code,
  });
};

/** `useClientSearch` / map prefetch — same key + fetch for instant profile paint after tap. */
export const clientProfileByIdQueryKey = (id: string) =>
  ["clientSearch", id] as const;
export const fetchClientProfileById = (id: string) => api.get(`/api/profiles/${id}`);

export const useClientSearch = (client_id: string | undefined) => {
  return useQuery({
    queryKey: clientProfileByIdQueryKey(client_id ?? ""),
    queryFn: () => fetchClientProfileById(client_id!),
    enabled: !!client_id && isUuid(client_id),
    staleTime: 60_000,
  });
};

export const useListAllHairdresserSearch = (
  searchQuery: string,
  clientId: string,
  professionCode?: string | null
) => {
  const code = professionCode?.trim() || undefined;
  return useQuery({
    queryKey: ["hairdresserSearch", searchQuery, code ?? "any"],
    queryFn: () => {
      const params = new URLSearchParams({ q: searchQuery });
      if (code) params.set("profession_code", code);
      return api.get<unknown[]>(
        `/api/profiles/search/hairdressers-with-relationship?${params.toString()}`
      );
    },
    enabled: !!searchQuery,
  });
};

export const useAddHairdresser = (
  hairdresser_id: string | string[],
  client_id: string | undefined,
  professionCode?: string | null
) => {
  const queryClient = useQueryClient();
  const code = professionCode?.trim() || undefined;
  return useMutation({
    mutationFn: () =>
      api.post("/api/relationships", {
        hairdresser_id,
        client_id: client_id ?? undefined,
        ...(code ? { profession_code: code } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({});
      queryClient.invalidateQueries({
        queryKey: ["clientSearch", client_id],
      });
    },
  });
};

export const useManageHairdresser = (client_id: string) => {
  return useQuery({
    queryKey: ["manageHairdresser", client_id],
    queryFn: () =>
      api.get<unknown[]>(
        `/api/relationships?client_id=${encodeURIComponent(client_id)}`
      ),
    enabled: !!client_id,
  });
};

export type RemoveRelationshipPayload =
  | string
  | { hairdresserId: string; professionCode?: string | null };

export const useRemoveRelationships = (clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: RemoveRelationshipPayload[]) => {
      for (const raw of items) {
        const hairdresserId =
          typeof raw === "string" ? raw : raw.hairdresserId;
        const professionCode =
          typeof raw === "string" ? undefined : raw.professionCode ?? undefined;
        await api.delete("/api/relationships", {
          hairdresserId,
          clientId,
          ...(professionCode ? { professionCode } : {}),
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["manageHairdresser", clientId],
      });
      await queryClient.invalidateQueries({ queryKey: ["relationship"] });
      await queryClient.invalidateQueries({
        queryKey: ["listAllHairdresserSearch", clientId],
      });
    },
  });
};
