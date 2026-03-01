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
import { getImageTransformUrl } from "../utils/supabaseHelpers";

export interface InspirationRow {
  id: string;
  owner_id: string;
  image_url: string | null;
  created_at: string;
  [key: string]: any;
}

export interface InspirationImage extends InspirationRow {
  image_url: string;
  full_url: string;
}

interface ImageContextValue {
  inspirationImages: InspirationImage[];
  avatarImage: string | null;
  imagesLoading: boolean;
  refreshInspirationImages: (silent?: boolean) => Promise<InspirationImage[]>;
  deleteInspirationImages: (imageUrls?: string[]) => Promise<void>;
  setInspirationImages: React.Dispatch<React.SetStateAction<InspirationImage[]>>;
}

// Helper wrapper that handles null paths
const getImageUrl = (
  bucket: string,
  path: string | null,
  width?: number,
  height?: number
): string | null => {
  if (!path) return null;
  return getImageTransformUrl(bucket, path, width, height);
};

const ImageContext = createContext<ImageContextValue>({
  inspirationImages: [],
  avatarImage: null,
  imagesLoading: true,
  refreshInspirationImages: async () => [],
  deleteInspirationImages: async () => {},
  setInspirationImages: () => {},
});

export const ImageProvider = ({ children }: { children: ReactNode }) => {
  const [inspirationImages, setInspirationImages] = useState<InspirationImage[]>([]);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [imagesLoading, setImagesLoading] = useState(true);
  const { profile, session } = useAuth();

  const fetchImagesFromDB = useCallback(async (): Promise<InspirationImage[]> => {
    if (!profile?.id) return [];

    try {
      const data = await api.get<InspirationRow[]>(
        `/api/inspirations?owner_id=${encodeURIComponent(profile.id)}`
      );
      return (
        (data ?? [])
          .filter((img) => !!img.image_url)
          .map((image) => ({
            ...image,
            image_url:
              getImageUrl("inspirations", image.image_url, 700, 700) ?? "",
            full_url:
              getImageUrl("inspirations", image.image_url, 1200, 1200) ?? "",
          }))
      );
    } catch (error) {
      console.error("Error fetching images:", error);
      return [];
    }
  }, [profile?.id]);

  const refreshInspirationImages = useCallback(
    async (silent = false): Promise<InspirationImage[]> => {
      if (!silent) setImagesLoading(true);
      try {
        const images = await fetchImagesFromDB();
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
      const thumb = getImageUrl("avatars", profile.avatar_url, 100, 100);
      const high = getImageUrl("avatars", profile.avatar_url, 250, 250);
      setAvatarImage(thumb);
      setTimeout(() => setAvatarImage(high), 150);
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
