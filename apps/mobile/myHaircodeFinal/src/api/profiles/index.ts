import { api } from "@/src/lib/apiClient";
import { useAuth } from "@/src/providers/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { supabase } from "@/src/lib/supabase";

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
  hairdresserId: string | null
) => {
  return useQuery({
    queryKey: ["clientSearch", searchQuery, hairdresserId],
    queryFn: () =>
      api.get<unknown[]>(
        `/api/profiles/search/clients?q=${encodeURIComponent(searchQuery)}&hairdresserId=${hairdresserId}`
      ),
    enabled: !!searchQuery && !!hairdresserId,
  });
};

export const useListAllClientSearch = (
  searchQuery: string,
  hairdresser_id: string
) => {
  return useQuery({
    queryKey: ["clientSearch", searchQuery, "all"],
    queryFn: () =>
      api.get<unknown[]>(
        `/api/profiles/search/clients-with-relationship?q=${encodeURIComponent(searchQuery)}`
      ),
    enabled: !!searchQuery,
  });
};

export const useClientSearch = (client_id: string) => {
  return useQuery({
    queryKey: ["clientSearch", client_id],
    queryFn: () => api.get(`/api/profiles/${client_id}`),
    enabled: !!client_id,
  });
};

export const useListAllHairdresserSearch = (
  searchQuery: string,
  clientId: string
) => {
  return useQuery({
    queryKey: ["hairdresserSearch", searchQuery],
    queryFn: () =>
      api.get<unknown[]>(
        `/api/profiles/search/hairdressers-with-relationship?q=${encodeURIComponent(searchQuery)}`
      ),
    enabled: !!searchQuery,
  });
};

export const useAddHairdresser = (
  hairdresser_id: string | string[],
  client_id: string | undefined
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post("/api/relationships", {
        hairdresser_id,
        client_id: client_id ?? undefined,
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

export const useRemoveRelationships = (clientId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (hairdresserIds: string[]) => {
      for (const hairdresserId of hairdresserIds) {
        await api.delete("/api/relationships", {
          hairdresserId,
          clientId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manageHairdresser", clientId] });
    },
  });
};
