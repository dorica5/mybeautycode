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
import { useI18n } from "@/src/providers/LanguageProvider";
import { billingQueryKey } from "@/src/api/billing";

export type VisitSubmitResult = {
  success: true;
  haircodeId: string;
  formattedDate: string;
  newHaircode: unknown;
  selectedOptions: unknown;
  price: unknown;
  duration: unknown;
};

export function parseVisitSaveErrorMessage(
  error: unknown,
  t: (key: string) => string
): string {
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message.trim()) return error.message;
  return t("visits.failedSaveVisit");
}

function visitListRowId(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  const id = (item as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

/** Drop a visit from every cached latest / client list (home, see all visits, etc.). */
export function removeVisitFromVisitListCaches(
  queryClient: QueryClient,
  haircodeId: string
) {
  if (!haircodeId) return;

  const withoutDeleted = (old: unknown) => {
    if (!Array.isArray(old)) return old;
    return old.filter((item) => visitListRowId(item) !== haircodeId);
  };

  queryClient.setQueriesData({ queryKey: ["latest_visits"] }, withoutDeleted);
  queryClient.setQueriesData({ queryKey: ["client_visits"] }, withoutDeleted);

  queryClient.removeQueries({ queryKey: [haircodeId, "visit_with_media"] });
  queryClient.removeQueries({ queryKey: [haircodeId, "visit_media"] });
}

function invalidateAllVisitListQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["latest_visits"],
      refetchType: "all",
    }),
    queryClient.invalidateQueries({
      queryKey: ["client_visits"],
      refetchType: "all",
    }),
  ]);
}

export const useDeleteHaircodeHairdresser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ haircodeId }: { haircodeId: string; hairdresserId: string }) => {
      await api.delete(`/api/visits/${haircodeId}/professional`);
      return { haircodeId };
    },
    onMutate: async ({ haircodeId }) => {
      await queryClient.cancelQueries({ queryKey: ["latest_visits"] });
      await queryClient.cancelQueries({ queryKey: ["client_visits"] });
      removeVisitFromVisitListCaches(queryClient, haircodeId);
    },
    onSuccess: ({ haircodeId }) => {
      removeVisitFromVisitListCaches(queryClient, haircodeId);
      void invalidateAllVisitListQueries(queryClient);
      router.back();
    },
    onError: (error: Error) => {
      void invalidateAllVisitListQueries(queryClient);
      Alert.alert("Error", error.message);
    },
  });
};

export const useCreateHaircode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return api.post<{ hairdresserId?: string }>("/api/visits", data);
    },
    onSuccess: (data: { hairdresserId?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["client_visits"] });
      queryClient.invalidateQueries({
        queryKey: ["professional_visits", data.hairdresserId],
      });
      queryClient.invalidateQueries({ queryKey: ["latest_visits"] });
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
    queryKey: ["client_visits", clientId, code ?? "all"],
    queryFn: () => {
      const base = `/api/visits?clientId=${encodeURIComponent(clientId)}`;
      const url = code ? `${base}&professionCode=${encodeURIComponent(code)}` : base;
      return api.get<unknown[]>(url);
    },
    enabled: Boolean(clientId) && queryEnabled,
    retry: 1,
  });
};

const fetchHaircodeMedia = async (haircode_id: string) => {
  return api.get<unknown[]>(`/api/visits/${haircode_id}/media`);
};

export const prefetchHaircodeMedia = async (
  haircode_ids: string[] = [],
  queryClient: ReturnType<typeof useQueryClient>
) => {
  if (!haircode_ids.length) return;
  try {
    const results = await Promise.all(
      haircode_ids.map((id) =>
        api.get<unknown[]>(`/api/visits/${id}/media`)
      )
    );
    const mediaByHaircodeId: Record<string, unknown[]> = {};
    haircode_ids.forEach((id, i) => {
      mediaByHaircodeId[id] = results[i] ?? [];
    });
    Object.entries(mediaByHaircodeId).forEach(([id, media]) => {
      queryClient.setQueryData([id, "visit_media"], media);
    });
    return mediaByHaircodeId;
  } catch (error) {
    console.error("Error prefetching media:", error);
    return {};
  }
};

export const useHaircodeMedia = (haircode_id: string) => {
  return useQuery({
    queryKey: [haircode_id, "visit_media"],
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
      queryKey: [id, "visit_media"],
      queryFn: () => fetchHaircodeMedia(id),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !!id,
    })),
  });
};

const HAIRCODE_WITH_MEDIA_STALE_MS = 5 * 60 * 1000;

export async function fetchHaircodeWithMedia(haircode_id: string) {
  return api.get<unknown>(`/api/visits/${haircode_id}`);
}

export function prefetchHaircodeWithMedia(
  queryClient: QueryClient,
  haircodeId: string
) {
  if (!haircodeId) return Promise.resolve();
  return queryClient.prefetchQuery({
    queryKey: [haircodeId, "visit_with_media"],
    queryFn: () => fetchHaircodeWithMedia(haircodeId),
    staleTime: HAIRCODE_WITH_MEDIA_STALE_MS,
  });
}

export const useHaircodeWithMedia = (haircode_id: string) => {
  return useQuery({
    queryKey: [haircode_id, "visit_with_media"],
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
    /** `v3`: latest visits require an active client link (same release as backend filter). */
    queryKey: ["latest_visits", "v3", hairdresserId, code ?? "pending"],
    queryFn: async () => {
      const q = code
        ? `?professionCode=${encodeURIComponent(code)}`
        : "";
      try {
        return await api.get<unknown[]>(`/api/visits/latest${q}`);
      } catch (e) {
        if (isVisitLimitError(e)) return [];
        throw e;
      }
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
      await api.delete(`/api/visits/${haircodeId}/client`);
      return haircodeId;
    },
    onMutate: async ({ haircodeId }) => {
      await queryClient.cancelQueries({ queryKey: ["latest_visits"] });
      await queryClient.cancelQueries({ queryKey: ["client_visits"] });
      removeVisitFromVisitListCaches(queryClient, haircodeId);
    },
    onSuccess: (haircodeId) => {
      removeVisitFromVisitListCaches(queryClient, haircodeId);
      void invalidateAllVisitListQueries(queryClient);
      router.back();
    },
    onError: (error: Error) => {
      void invalidateAllVisitListQueries(queryClient);
      Alert.alert("Error", error.message);
    },
  });
};

export const updateHaircode = async (
  haircodeId: string,
  updateData: Record<string, unknown>
) => {
  return api.put<Record<string, unknown>>(`/api/visits/${haircodeId}`, updateData);
};

export const deleteHaircodeMedia = async (haircodeId: string) => {
  const media = await api.get<{ media_url: string }[]>(
    `/api/visits/${haircodeId}/media`
  );
  if (media?.length) {
    await api.delete(`/api/visits/${haircodeId}/media`, {
      mediaUrls: media.map((m) => m.media_url),
    });
  }
};

export const insertHaircodeMedia = async (
  mediaRecords: { haircode_id: string; media_url: string; media_type: string }[]
) => {
  return api.post("/api/visits/media", { records: mediaRecords });
};

export const deleteMediaItems = async (
  haircodeId: string,
  mediaUrls: string[]
) => {
  if (!mediaUrls?.length) return;
  await api.delete(`/api/visits/${haircodeId}/media`, { mediaUrls });
};

export const useSubmitHaircode = () => {
  const queryClient = useQueryClient();
  const { t } = useI18n();

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
        const data = await api.post<{ id: string; createdAt: string; service_description?: string; services?: string; price?: string; duration?: string }>("/api/visits", {
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
      queryClient.invalidateQueries({ queryKey: billingQueryKey });

      if (!isEditing) {
        try {
          const client_id = params.clientId as string;
          await sendPushNotification(
            client_id,
            profile.id,
            "HAIRCODE_ADDED",
            t("push.newVisitAddedBody", { name: profile.full_name ?? t("common.professional") }),
            {
              isClient: false,
              senderName: profile.full_name,
              senderAvatar: profile.avatar_url,
              haircodeId: result.haircodeId,
            },
            t("push.newVisitAddedTitle")
          );
        } catch (err) {
          console.error("Error sending notification:", err);
        }
      }

    },
  });
};
