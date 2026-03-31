import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "@/src/lib/apiClient";
import { Alert } from "react-native";
import { useImageContext } from "./ImageProvider";
import { useAuth } from "./AuthProvider";
import { randomUUID } from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import { sendPushNotification } from "./useNotifcations";
import { uploadToStorage } from "../lib/uploadHelpers";
import {
  fetchSignedStorageUrl,
  normalizeStorageObjectPath,
} from "../lib/storageSignedUrl";

type MarkData = {
  marked: boolean;
  setMarked: (val: boolean) => void;
  selectedImages: string[];
  setSelectedImages: (images: string[] | ((prev: string[]) => string[])) => void;
  handleDelete: () => Promise<void>;
  buttonText: string;
  setButtonText: (text: string) => void;
  selectedImage: string | null;
  setSelectedImage: (image: string | null) => void;
  imageGallery: any[];
  setImageGallery: (gallery: any[]) => void;
  resetState: () => void;
  selectedRecipient: string | null;
  setSelectedRecipient: (recipient: string | null) => void;
  handleShare: (recipientId: string) => Promise<void>;
};

const MarkContext = createContext<MarkData>({
  marked: false,
  setMarked: () => {},
  selectedImages: [],
  setSelectedImages: () => {},
  handleDelete: async () => {},
  buttonText: "Mark images",
  setButtonText: () => {},
  selectedImage: null,
  setSelectedImage: () => {},
  imageGallery: [],
  setImageGallery: () => {},
  resetState: () => {},
  selectedRecipient: null,
  setSelectedRecipient: () => {},
  handleShare: async () => {},
});

export default function MarkProvider({ children }: PropsWithChildren) {
  const [marked, setMarked] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [buttonText, setButtonText] = useState("Mark images");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageGallery, setImageGallery] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const { refreshInspirationImages, deleteInspirationImages } = useImageContext();
  const { profile } = useAuth();

  const handleDelete = async () => {
    try {
      const updatedGallery = imageGallery.filter(
        img => !selectedImages.includes(img.image_url)
      );
      
      setImageGallery(updatedGallery);
      setButtonText("Mark images");
      setMarked(false);
      setSelectedImages([]);
      
      await deleteInspirationImages(selectedImages);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleShare = async (recipientId) => {
    if (!recipientId || selectedImages.length === 0) {
      Alert.alert("Error", "Please select a recipient and images to share.");
      return;
    }
  
    try {
      const batchId = randomUUID();
      const STORAGE_BUCKET = "shared_inspiration_images";
  
      const uploadedImages = await Promise.all(
        selectedImages.map(async (imagePath) => {
          const objectPath =
            normalizeStorageObjectPath("inspirations", imagePath) ??
            (imagePath.includes("/inspirations/")
              ? imagePath.split("/inspirations/")[1]?.split("?")[0]
              : imagePath.split("/").pop()?.split("?")[0]) ??
            imagePath;
          const storageUrl = await fetchSignedStorageUrl(
            "inspirations",
            objectPath
          );
          if (!storageUrl) throw new Error("Could not resolve inspiration image");
          const downloadResult = await FileSystem.downloadAsync(
            storageUrl,
            FileSystem.cacheDirectory + `${randomUUID()}.png`
          );
          const path = await uploadToStorage(
            downloadResult.uri,
            STORAGE_BUCKET,
            undefined,
            "image/png"
          );
          if (!path) throw new Error("Upload failed");
          return { imageUrl: path };
        })
      );

      await api.post("/api/shared-inspirations", {
        recipient_id: recipientId,
        batch_id: batchId,
        items: uploadedImages.map(({ imageUrl }) => ({ imageUrl })),
      });
  
      await sendPushNotification(
        recipientId,
        profile.id,
        "INSPIRATION_SHARED",
        `${profile.full_name} shared inspiration with you.`,
        {
          senderName: profile.full_name,
          senderAvatar: profile.avatar_url,
          batchId,
        },
        "New Inspiration Shared"
      );
  
      setSelectedImages([]);
      setMarked(false);
      setSelectedRecipient(null);
      Alert.alert("Success", "Inspiration shared!");
    } catch (error) {
      console.error("Sharing error:", error);
      Alert.alert("Error", "Failed to share inspiration.");
    }
  };

  useEffect(() => {
    if (buttonText === "Mark images") {
      setSelectedImages([]);
      setMarked(false);
    }
  }, [buttonText]);

  const resetState = useCallback(() => {
    setMarked(false);
    setSelectedImages([]);
    setButtonText("Mark images");
    setSelectedImage(null);
    setSelectedRecipient(null);
  }, []);

  return (
    <MarkContext.Provider
      value={{
        marked,
        setMarked,
        selectedImages,
        setSelectedImages,
        handleDelete,
        buttonText,
        setButtonText,
        selectedImage,
        setSelectedImage,
        imageGallery,
        setImageGallery,
        resetState,
        selectedRecipient,
        setSelectedRecipient,
        handleShare,
      }}
    >
      {children}
    </MarkContext.Provider>
  );
}

export const useMark = () => useContext(MarkContext);
