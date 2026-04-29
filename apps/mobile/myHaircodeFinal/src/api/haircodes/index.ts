import { api } from "@/src/lib/apiClient";
import { setLastProfessionCode } from "@/src/lib/lastVisitPreference";
import { sendPushNotification } from "@/src/providers/useNotifcations";
import type { QueryClient } from "@tanstack/react-query";
import {
  useMutation,
  useQuery,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";

export const useDeleteHaircodeHairdresser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ haircodeId }: { haircodeId: string; hairdresserId: string }) => {
      await queryClient.invalidateQueries({ queryKey: ["latest_haircodes"] });
      await api.delete(`/api/haircodes/${haircodeId}/hairdresser`);
      return { success: true };
    },
    onSuccess: (_, { hairdresserId }) => {
      queryClient.invalidateQueries({ queryKey: ["latest_haircodes", hairdresserId] });
      queryClient.invalidateQueries({ queryKey: ["client_haircodes"] });
      router.back();
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });
};

export const useCreateHaircode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return api.post<{ hairdresserId?: string }>("/api/haircodes", data);
    },
    onSuccess: (data: { hairdresserId?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["client_haircodes"] });
      queryClient.invalidateQueries({
        queryKey: ["hairdresser_haircodes", data.hairdresserId],
      });
      queryClient.invalidateQueries({ queryKey: ["latest_haircodes"] });
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });
};

export const useListClientHaircodes = (
  clientId: string,
  professionCode?: string | null,
  queryEnabled: boolean = true
) => {
  const code =
    professionCode && professionCode.trim() ? professionCode.trim() : null;
  return useQuery({
    queryKey: ["client_haircodes", clientId, code ?? "all"],
    queryFn: () => {
      const base = `/api/haircodes?clientId=${encodeURIComponent(clientId)}`;
      const url = code ? `${base}&professionCode=${encodeURIComponent(code)}` : base;
      return api.get<unknown[]>(url);
    },
    enabled: Boolean(clientId) && queryEnabled,
    retry: 1,
  });
};

const fetchHaircodeMedia = async (haircode_id: string) => {
  return api.get<unknown[]>(`/api/haircodes/${haircode_id}/media`);
};

export const prefetchHaircodeMedia = async (
  haircode_ids: string[] = [],
  queryClient: ReturnType<typeof useQueryClient>
) => {
  if (!haircode_ids.length) return;
  try {
    const results = await Promise.all(
      haircode_ids.map((id) =>
        api.get<unknown[]>(`/api/haircodes/${id}/media`)
      )
    );
    const mediaByHaircodeId: Record<string, unknown[]> = {};
    haircode_ids.forEach((id, i) => {
      mediaByHaircodeId[id] = results[i] ?? [];
    });
    Object.entries(mediaByHaircodeId).forEach(([id, media]) => {
      queryClient.setQueryData([id, "haircode_media"], media);
    });
    return mediaByHaircodeId;
  } catch (error) {
    console.error("Error prefetching media:", error);
    return {};
  }
};

export const useHaircodeMedia = (haircode_id: string) => {
  return useQuery({
    queryKey: [haircode_id, "haircode_media"],
    queryFn: () => fetchHaircodeMedia(haircode_id),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!haircode_id,
  });
};

export const usePrefetchVisibleHaircodes = (visibleHaircodeIds: string[] = []) => {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (visibleHaircodeIds.length > 0) {
      prefetchHaircodeMedia(visibleHaircodeIds, queryClient);
    }
  }, [visibleHaircodeIds.join(","), queryClient]);
};

export const useMultipleHaircodeMedia = (haircode_ids: string[] = []) => {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (haircode_ids.length > 0) {
      prefetchHaircodeMedia(haircode_ids, queryClient);
    }
  }, [haircode_ids.join(","), queryClient]);

  return useQueries({
    queries: haircode_ids.map((id) => ({
      queryKey: [id, "haircode_media"],
      queryFn: () => fetchHaircodeMedia(id),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !!id,
    })),
  });
};

const HAIRCODE_WITH_MEDIA_STALE_MS = 5 * 60 * 1000;

export async function fetchHaircodeWithMedia(haircode_id: string) {
  return api.get<unknown>(`/api/haircodes/${haircode_id}`);
}

export function prefetchHaircodeWithMedia(
  queryClient: QueryClient,
  haircodeId: string
) {
  if (!haircodeId) return Promise.resolve();
  return queryClient.prefetchQuery({
    queryKey: [haircodeId, "haircode_with_media"],
    queryFn: () => fetchHaircodeWithMedia(haircodeId),
    staleTime: HAIRCODE_WITH_MEDIA_STALE_MS,
  });
}

export const useHaircodeWithMedia = (haircode_id: string) => {
  return useQuery({
    queryKey: [haircode_id, "haircode_with_media"],
    queryFn: () => fetchHaircodeWithMedia(haircode_id),
    staleTime: HAIRCODE_WITH_MEDIA_STALE_MS,
    enabled: !!haircode_id,
  });
};

export const useLatestHaircodes = (
  hairdresserId: string | undefined,
  professionCode: string | null | undefined,
  options?: { activeProfessionReady?: boolean }
) => {
  const code =
    professionCode && professionCode.trim() ? professionCode.trim() : null;
  const ready = options?.activeProfessionReady !== false;

  return useQuery({
    /** `v2` + lane suffix drops stale caches from builds that used `…, "all"` without a scoped fetch. */
    queryKey: ["latest_haircodes", "v2", hairdresserId, code ?? "pending"],
    queryFn: async () => {
      const q = code
        ? `?professionCode=${encodeURIComponent(code)}`
        : "";
      return api.get<unknown[]>(`/api/haircodes/latest${q}`);
    },
    staleTime: 0,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    refetchInterval: 30000,
    enabled:
      Boolean(hairdresserId) && Boolean(code) && ready,
    retry: 1,
  });
};

export const useDeleteHaircodeClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      haircodeId,
    }: {
      haircodeId: string;
      hairdresserId: string;
    }) => {
      await api.delete(`/api/haircodes/${haircodeId}/client`);
      return haircodeId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client_haircodes"] });
      queryClient.invalidateQueries({
        queryKey: ["hairdresser_haircodes", variables.hairdresserId],
      });
      router.back();
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });
};

export const updateHaircode = async (
  haircodeId: string,
  updateData: Record<string, unknown>
) => {
  return api.put<Record<string, unknown>>(`/api/haircodes/${haircodeId}`, updateData);
};

export const deleteHaircodeMedia = async (haircodeId: string) => {
  const media = await api.get<{ media_url: string }[]>(
    `/api/haircodes/${haircodeId}/media`
  );
  if (media?.length) {
    await api.delete(`/api/haircodes/${haircodeId}/media`, {
      mediaUrls: media.map((m) => m.media_url),
    });
  }
};

export const insertHaircodeMedia = async (
  mediaRecords: { haircode_id: string; media_url: string; media_type: string }[]
) => {
  return api.post("/api/haircodes/media", { records: mediaRecords });
};

export const deleteMediaItems = async (
  haircodeId: string,
  mediaUrls: string[]
) => {
  if (!mediaUrls?.length) return;
  await api.delete(`/api/haircodes/${haircodeId}/media`, { mediaUrls });
};

export const useSubmitHaircode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      isEditing,
      params,
      newHaircode,
      selectedOptions,
      price,
      duration,
      capturedMedia,
      mediaToDelete,
      profile,
      clientId,
      uploadMedia,
      hasMediaChanged,
      professionCode,
    }: {
      isEditing: boolean;
      params: Record<string, unknown>;
      newHaircode: string;
      selectedOptions: string[];
      price: string;
      duration: string;
      capturedMedia: { uri: string; type: string; isFromDB?: boolean; media_url?: string }[];
      mediaToDelete?: string[];
      profile: { id: string; full_name: string; avatar_url?: string; salon_name?: string };
      clientId: string;
      uploadMedia: (index: number) => Promise<string | null>;
      hasMediaChanged: () => boolean;
      /** Active professional surface when creating a visit (ignored when editing). */
      professionCode: string;
    }) => {
      const haircodeData = {
        service_description: newHaircode,
        services: selectedOptions.join(", "),
        price,
        duration,
      };

      let haircodeId: string;
      let updatedHaircode: Record<string, unknown>;

      if (isEditing) {
        haircodeId = params.haircodeId as string;
        updatedHaircode = await updateHaircode(haircodeId, haircodeData);

        if (hasMediaChanged()) {
          if (mediaToDelete?.length) {
            await deleteMediaItems(haircodeId, mediaToDelete);
          }
          const newMediaItems = capturedMedia.filter((m) => !m.isFromDB);
          if (newMediaItems.length) {
            const mediaUrls: { url: string; type: "image" | "video" }[] = [];
            for (const item of newMediaItems) {
              const idx = capturedMedia.findIndex((m) => m === item);
              if (idx !== -1) {
                const mediaUrl = await uploadMedia(idx);
                if (mediaUrl) {
                  mediaUrls.push({
                    url: mediaUrl,
                    type: (item.type === "video" ? "video" : "image") as "image" | "video",
                  });
                }
              }
            }
            if (mediaUrls.length) {
              await insertHaircodeMedia(
                mediaUrls.map((m) => ({
                  haircode_id: haircodeId,
                  media_url: m.url,
                  media_type: m.type,
                }))
              );
            }
          }
        }
      } else {
        await setLastProfessionCode(profile.id, professionCode);
        const data = await api.post<{ id: string; createdAt: string; service_description?: string; services?: string; price?: string; duration?: string }>("/api/haircodes", {
          ...haircodeData,
          client_id: clientId,
          hairdresser_id: profile.id,
          hairdresser_name: profile.full_name,
          profession_code: professionCode,
        });
        haircodeId = data.id;
        updatedHaircode = data;

        const mediaUrls: { url: string; type: "image" | "video" }[] = [];
        for (let i = 0; i < capturedMedia.length; i++) {
          const mediaUrl = await uploadMedia(i);
          if (mediaUrl) {
            mediaUrls.push({
              url: mediaUrl,
              type: (capturedMedia[i].type === "video" ? "video" : "image") as "image" | "video",
            });
          }
        }
        if (mediaUrls.length) {
          await insertHaircodeMedia(
            mediaUrls.map((m) => ({
              haircode_id: haircodeId,
              media_url: m.url,
              media_type: m.type,
            }))
          );
        }
      }

      const formattedDate = new Date((updatedHaircode.created_at as string) ?? Date.now())
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        })
        .replace(/\//g, ".");

      return {
        success: true,
        haircodeId,
        formattedDate,
        newHaircode: updatedHaircode.service_description,
        selectedOptions: updatedHaircode.services,
        price: updatedHaircode.price,
        duration: updatedHaircode.duration,
      };
    },
    onSuccess: async (result, variables) => {
      const { isEditing, params, profile } = variables;
      if (!profile || !params) return;

      queryClient.invalidateQueries({});

      if (!isEditing) {
        try {
          const client_id = params.clientId as string;
          await sendPushNotification(
            client_id,
            profile.id,
            "HAIRCODE_ADDED",
            `${profile.full_name} has added a new haircode.`,
            {
              isClient: false,
              senderName: profile.full_name,
              senderAvatar: profile.avatar_url,
              haircodeId: result.haircodeId,
            },
            "New Haircode Added"
          );
        } catch (err) {
          console.error("Error sending notification:", err);
        }
      }

      Alert.alert(
        "Success",
        isEditing ? "Haircode updated successfully!" : "Haircode created successfully!"
      );

      setTimeout(() => {
        if (isEditing) {
          router.replace({
            pathname: "/haircodes/single_haircode",
            params: {
              haircodeId: result.haircodeId,
              description: String(result.newHaircode),
              services: String(result.selectedOptions),
              price: String(result.price),
              duration: String(result.duration),
              createdAt: result.formattedDate,
              hairdresserName: (params.hairdresserName as string) || profile.full_name,
              full_name: params.full_name as string,
              number: params.number as string,
              salon_name: (params.salon_name as string) || profile.salon_name,
              hairdresser_profile_pic:
                (params.hairdresser_profile_pic as string) || profile.avatar_url,
            },
          });
        } else {
          router.back();
        }
      }, 500);
    },
    onError: (error: unknown) => {
      const msg =
        typeof error === "string"
          ? error
          : error instanceof Error
          ? error.message
          : "Failed to save haircode";
      Alert.alert("Error", msg);
    },
  });
};
