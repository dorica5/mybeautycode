import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { api } from "../lib/apiClient";
import { useAuth } from "./AuthProvider";
import { pickActiveProfessionCode } from "../constants/professionCodes";
import { getLastProfessionCode, getSessionProfessionPin } from "../lib/lastVisitPreference";
import { resolveAvatarStoragePath } from "../lib/resolveAvatarStoragePath";
import {
  fetchSignedStorageUrl,
  fetchSignedStorageUrls,
} from "../lib/storageSignedUrl";

export interface InspirationRow {
  id: string;
  owner_id: string;
  image_url: string | null;
  created_at: string;
  [key: string]: any;
}

export interface InspirationImage extends InspirationRow {
  /**
   * Storage object path in `inspirations` (not a full URL). Used for delete/share and signing full-size when needed.
   */
  image_url: string;
  /** Signed URL for grid thumbnail (low-res object or fallback path). */
  thumbnail_url: string;
  /** @deprecated Use `image_url` path + sign when needed; kept empty for compatibility. */
  full_url?: string;
}

export type DeleteInspirationArg =
  | string[]
  | { imageUrls?: string[]; ids?: string[] };

function normalizeDeleteInspirationArg(
  input?: DeleteInspirationArg
): { imageUrls?: string[]; ids?: string[] } {
  if (!input) return {};
  if (Array.isArray(input)) {
    const imageUrls = input.filter((s) => typeof s === "string" && s.trim());
    return imageUrls.length ? { imageUrls } : {};
  }
  const ids = input.ids?.filter((s) => typeof s === "string" && s.trim());
  const imageUrls = input.imageUrls?.filter((s) => typeof s === "string" && s.trim());
  return {
    ...(ids?.length ? { ids } : {}),
    ...(imageUrls?.length ? { imageUrls } : {}),
  };
}

interface ImageContextValue {
  inspirationImages: InspirationImage[];
  avatarImage: string | null;
  imagesLoading: boolean;
  refreshAvatarImage: (
    options?: string | null | { professionCode?: string | null; storagePath?: string | null }
  ) => Promise<void>;
  refreshInspirationImages: (
    silent?: boolean,
    professionCode?: string
  ) => Promise<InspirationImage[]>;
  deleteInspirationImages: (payload?: DeleteInspirationArg) => Promise<void>;
  setInspirationImages: React.Dispatch<React.SetStateAction<InspirationImage[]>>;
}

const ImageContext = createContext<ImageContextValue>({
  inspirationImages: [],
  avatarImage: null,
  imagesLoading: true,
  refreshAvatarImage: async () => {},
  refreshInspirationImages: async () => [] as InspirationImage[],
  deleteInspirationImages: async () => {},
  setInspirationImages: () => {},
});

export const ImageProvider = ({ children }: { children: ReactNode }) => {
  const [inspirationImages, setInspirationImages] = useState<InspirationImage[]>([]);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [imagesLoading, setImagesLoading] = useState(true);
  const { profile, session, lastAppSurfacePref } = useAuth();
  /** Drop stale sign responses when profile updates race with an explicit save refresh. */
  const avatarRequestIdRef = useRef(0);

  const fetchImagesFromDB = useCallback(
    async (professionCode: string): Promise<InspirationImage[]> => {
    if (!profile?.id) return [];

    try {
      const data = await api.get<InspirationRow[]>(
        `/api/inspirations?owner_id=${encodeURIComponent(
          profile.id
        )}&profession=${encodeURIComponent(professionCode)}`
      );
      const withPath = (data ?? []).filter((img) => !!img.image_url);
      const thumbPaths = withPath.map((img) => {
        const low = img.low_res_image_url as string | null | undefined;
        const high = img.image_url as string;
        return low && String(low).trim() ? String(low) : high;
      });
      /** Only sign thumbnails for the grid — halves sign-batch work and avoids downloading full-res in lists. */
      const thumbSigned = await fetchSignedStorageUrls(
        thumbPaths.map((path) => ({ bucket: "inspirations", path }))
      );
      return withPath.map((image, i) => ({
        ...image,
        thumbnail_url: thumbSigned[i] ?? "",
        full_url: "",
      })) as InspirationImage[];
    } catch (error) {
      console.error("Error fetching images:", error);
      return [];
    }
  },
  [profile?.id]
  );

  const refreshInspirationImages = useCallback(
    async (silent = false, professionCode: string = "hair"): Promise<InspirationImage[]> => {
      if (!silent) setImagesLoading(true);
      try {
        const images = await fetchImagesFromDB(professionCode);
        setInspirationImages(images);
        return images;
      } catch (error) {
        console.error("Error refreshing images:", error);
        return [];
      } finally {
        if (!silent) setImagesLoading(false);
      }
    },
    [fetchImagesFromDB]
  );

  const deleteInspirationImages = useCallback(
    async (payload?: DeleteInspirationArg): Promise<void> => {
      const { imageUrls, ids } = normalizeDeleteInspirationArg(payload);
      if ((!imageUrls || !imageUrls.length) && (!ids || !ids.length)) return;
      setImagesLoading(true);

      try {
        setInspirationImages((prev) =>
          prev.filter((item) => {
            if (ids?.includes(String(item.id))) return false;
            if (imageUrls?.includes(item.image_url)) return false;
            return true;
          })
        );
        const body: { imageUrls?: string[]; ids?: string[] } = {};
        if (imageUrls?.length) body.imageUrls = imageUrls;
        if (ids?.length) body.ids = ids;
        await api.post("/api/inspirations/delete", body);
      } catch (error) {
        console.error("Error deleting images:", error);
        const stored = profile?.id ? await getLastProfessionCode(profile.id) : null;
        const pinned = getSessionProfessionPin();
        const code =
          lastAppSurfacePref === "client"
            ? "hair"
            : pickActiveProfessionCode(
                profile?.profession_codes as string[] | null | undefined,
                pinned ?? stored ?? undefined
              ) ?? "hair";
        await refreshInspirationImages(true, code);
        throw error;
      } finally {
        setImagesLoading(false);
      }
    },
    [refreshInspirationImages, lastAppSurfacePref, profile?.id, profile?.profession_codes]
  );

  const fetchAvatarImage = useCallback(
    async (overrideProfessionCode?: string | null, requestId?: number) => {
      const id = requestId ?? ++avatarRequestIdRef.current;
      if (!profile) {
        if (id === avatarRequestIdRef.current) setAvatarImage(null);
        return;
      }
      const pinned = getSessionProfessionPin();
      const stored = profile.id ? await getLastProfessionCode(profile.id) : null;
      const activeCode =
        lastAppSurfacePref === "client"
          ? null
          : pickActiveProfessionCode(
              profile.profession_codes,
              overrideProfessionCode ?? pinned ?? stored ?? undefined
            );

      const path = resolveAvatarStoragePath(profile, activeCode);
      if (!path) {
        if (id === avatarRequestIdRef.current) setAvatarImage(null);
        return;
      }
      try {
        const url = await fetchSignedStorageUrl("avatars", path);
        if (id !== avatarRequestIdRef.current) return;
        setAvatarImage(url);
      } catch (error) {
        console.error("Error fetching avatar:", error);
        if (id === avatarRequestIdRef.current) setAvatarImage(null);
      }
    },
    [profile, lastAppSurfacePref]
  );

  const refreshAvatarImage = useCallback(
    async (
      options?: string | null | {
        professionCode?: string | null;
        storagePath?: string | null;
      }
    ) => {
      const requestId = ++avatarRequestIdRef.current;
      let professionCode: string | null | undefined;
      let storagePath: string | null | undefined;
      if (typeof options === "string" || options === null) {
        professionCode = options;
      } else if (options && typeof options === "object") {
        professionCode = options.professionCode;
        storagePath = options.storagePath;
      }

      const pathOverride = storagePath?.trim() || null;
      if (pathOverride) {
        try {
          const url = await fetchSignedStorageUrl("avatars", pathOverride);
          if (requestId !== avatarRequestIdRef.current) return;
          setAvatarImage(url);
        } catch (error) {
          console.error("Error fetching avatar:", error);
          if (requestId === avatarRequestIdRef.current) setAvatarImage(null);
        }
        return;
      }
      await fetchAvatarImage(professionCode, requestId);
    },
    [fetchAvatarImage]
  );

  const professionAvatarsKey =
    profile?.professions_detail
      ?.map((row) => `${row.profession_code ?? ""}:${row.avatar_url ?? ""}`)
      .join("|") ?? "";

  useEffect(() => {
    if (!session) {
      setInspirationImages([]);
      setAvatarImage(null);
      setImagesLoading(false);
      return;
    }
    if (profile?.id) {
      const requestId = ++avatarRequestIdRef.current;
      void fetchAvatarImage(undefined, requestId);
      void (async () => {
        const pinned = getSessionProfessionPin();
        const stored = await getLastProfessionCode(profile.id);
        const code =
          lastAppSurfacePref === "client"
            ? "hair"
            : pickActiveProfessionCode(
                profile.profession_codes,
                pinned ?? stored ?? undefined
              ) ?? "hair";
        await refreshInspirationImages(false, code);
      })();
    }
  }, [
    session,
    profile?.id,
    profile?.avatar_url,
    professionAvatarsKey,
    profile?.profession_codes,
    lastAppSurfacePref,
    refreshInspirationImages,
    fetchAvatarImage,
  ]);

  return (
    <ImageContext.Provider
      value={{
        inspirationImages,
        avatarImage,
        imagesLoading,
        refreshAvatarImage,
        refreshInspirationImages,
        deleteInspirationImages,
        setInspirationImages,
      }}
    >
      {children}
    </ImageContext.Provider>
  );
};

export const useImageContext = () => useContext(ImageContext);
