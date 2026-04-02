import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { api } from "../lib/apiClient";
import { useAuth } from "./AuthProvider";
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
  /** Full-resolution signed URL (same object as DB `image_url` path). */
  image_url: string;
  full_url: string;
  /** Grid/list: smaller file when `low_res_image_url` exists in DB. */
  thumbnail_url: string;
}

interface ImageContextValue {
  inspirationImages: InspirationImage[];
  avatarImage: string | null;
  imagesLoading: boolean;
  refreshInspirationImages: (
    silent?: boolean,
    professionCode?: string
  ) => Promise<InspirationImage[]>;
  deleteInspirationImages: (imageUrls?: string[]) => Promise<void>;
  setInspirationImages: React.Dispatch<React.SetStateAction<InspirationImage[]>>;
}

const ImageContext = createContext<ImageContextValue>({
  inspirationImages: [],
  avatarImage: null,
  imagesLoading: true,
  refreshInspirationImages: async () => [] as InspirationImage[],
  deleteInspirationImages: async () => {},
  setInspirationImages: () => {},
});

export const ImageProvider = ({ children }: { children: ReactNode }) => {
  const [inspirationImages, setInspirationImages] = useState<InspirationImage[]>([]);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [imagesLoading, setImagesLoading] = useState(true);
  const { profile, session } = useAuth();

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
      const fullPaths = withPath.map((img) => img.image_url as string);
      const [thumbSigned, fullSigned] = await Promise.all([
        fetchSignedStorageUrls(
          thumbPaths.map((path) => ({ bucket: "inspirations", path }))
        ),
        fetchSignedStorageUrls(
          fullPaths.map((path) => ({ bucket: "inspirations", path }))
        ),
      ]);
      return withPath.map((image, i) => ({
        ...image,
        thumbnail_url: thumbSigned[i] ?? "",
        image_url: fullSigned[i] ?? "",
        full_url: fullSigned[i] ?? "",
      }));
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
  async (imageUrls?: string[]): Promise<void> => {
    if (!imageUrls || imageUrls.length === 0) return;
    setImagesLoading(true);

    try {
      setInspirationImages((prev) =>
        prev.filter((item) => !imageUrls.includes(item.image_url))
      );
      await api.delete("/api/inspirations", { imageUrls });
    } catch (error) {
      console.error("Error deleting images:", error);
      await refreshInspirationImages(true);
    } finally {
      setImagesLoading(false);
    }
  },
  [refreshInspirationImages]
);

  const fetchAvatarImage = useCallback(async () => {
    if (!profile?.avatar_url) {
      setAvatarImage(null);
      return;
    }
    try {
      const url = await fetchSignedStorageUrl("avatars", profile.avatar_url);
      setAvatarImage(url);
    } catch (error) {
      console.error("Error fetching avatar:", error);
      setAvatarImage(null);
    }
  }, [profile?.avatar_url]);

  useEffect(() => {
    if (!session) {
      setInspirationImages([]);
      setAvatarImage(null);
      setImagesLoading(false);
      return;
    }
    if (profile?.id) {
      fetchAvatarImage();
      refreshInspirationImages();
    }
  }, [session, profile?.id, refreshInspirationImages, fetchAvatarImage]);

  return (
    <ImageContext.Provider
      value={{
        inspirationImages,
        avatarImage,
        imagesLoading,
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
