import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  Dimensions,
  View,
  Modal,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import { randomUUID } from "expo-crypto";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import InspirationTopNav from "@/src/components/InspirationTopNav";
import MarkCancelButton from "@/src/components/MarkCancelButton";
import { Images, Plus, X } from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useSaveInspirationToDatabase } from "@/src/api/inspirations";
import { useAuth } from "@/src/providers/AuthProvider";
import { uploadToStorage } from "@/src/lib/uploadHelpers";
import { useMark } from "@/src/providers/MarkProvider";
import { Href, router, useFocusEffect } from "expo-router";
import {
  useImageContext,
  type InspirationImage,
} from "@/src/providers/ImageProvider";
import OptimizedImage from "@/src/components/OptimizedImage";
import ImageCropModal from "@/src/components/ImageCropModal";
import { fetchSignedStorageUrls } from "@/src/lib/storageSignedUrl";
import Carousel from "react-native-reanimated-carousel";
import CustomAlert from "@/src/components/CustomAlert";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
  secondaryGreen,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveScale,
  scalePercent,
  responsiveFontSize,
  responsiveBorderRadius,
} from "@/src/utils/responsive";
import { usePostHog } from "posthog-react-native";
import {
  type InspirationFilterTab,
  inspirationFilterTabToProfessionCode,
  CLIENT_INSPIRATION_PROFESSION_CODE,
  profileHasProfessionalCapability,
} from "@/src/constants/professionCodes";

const NUM_COLUMNS = 2;

type InspirationProfession = InspirationFilterTab;

const CATEGORY_TABS: { code: InspirationProfession; label: string }[] = [
  { code: "hair", label: "Hair" },
  { code: "nails", label: "Nails" },
  { code: "brows", label: "Brows" },
];

/** Align with backend inspirationService.deleteByImageUrls so Prisma + storage paths match. */
function toInspirationDeletePath(url: string): string {
  const raw = String(url ?? "")
    .trim()
    .split("?")[0];
  if (!raw) return "";
  if (raw.includes("/inspirations/")) {
    const p = raw.split("/inspirations/")[1];
    return decodeURIComponent(p?.split("?")[0] ?? "") || raw;
  }
  const publicMarker = "/object/public/inspirations/";
  if (raw.includes(publicMarker)) {
    const tail = raw.split(publicMarker)[1] ?? "";
    return decodeURIComponent(tail.split("?")[0] ?? "") || raw;
  }
  if (raw.includes("/") && !raw.startsWith("http")) {
    return raw;
  }
  return raw.split("/").pop() ?? raw;
}

const MyInspiration = () => {
  const [inspirationCategory, setInspirationCategory] =
    useState<InspirationProfession>("hair");
  const inspirationCategoryRef = useRef<InspirationProfession>("hair");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startingIndex, setStartingIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [detailDeleteAlertVisible, setDetailDeleteAlertVisible] =
    useState(false);
  /** Storage path for the image currently focused in the detail carousel (for reliable delete). */
  const [detailDeleteTargetPath, setDetailDeleteTargetPath] = useState<
    string | null
  >(null);
  /** DB row id — primary key for delete API (avoids path / client mismatch). */
  const [detailDeleteTargetId, setDetailDeleteTargetId] = useState<string | null>(
    null
  );
  /** Full-screen signed URLs for the carousel (batch-fetched when modal opens). */
  const [carouselFullUrls, setCarouselFullUrls] = useState<Record<string, string>>(
    {}
  );
  const width = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const safeInsets = useSafeAreaInsets();
  const horizontalPadding = scalePercent(5);
  const columnGap = responsiveScale(12);
  const gridInnerWidth = width - horizontalPadding * 2;
  const cellSize = (gridInnerWidth - columnGap) / NUM_COLUMNS;
  const detailCarouselViewportHeight = Math.min(
    screenHeight * 0.62,
    responsiveScale(520)
  );

  useEffect(() => {
    inspirationCategoryRef.current = inspirationCategory;
  }, [inspirationCategory]);

  const {
    setMarked,
    selectedImages,
    setSelectedImages,
    buttonText,
    setButtonText,
    selectedImage,
    setSelectedImage,
    imageGallery,
    setImageGallery,
    resetState,
  } = useMark();

  const carouselBatchKey = useMemo(() => {
    const g = Array.isArray(imageGallery) ? imageGallery : [];
    return g
      .filter((item) => item?.id && !item.localUri && !item.isTemp)
      .map((item) => `${item.id}:${item.image_url}`)
      .join("|");
  }, [imageGallery]);

  useEffect(() => {
    if (!modalVisible) {
      setCarouselFullUrls({});
      return;
    }

    const safeGallery = Array.isArray(imageGallery) ? imageGallery : [];
    const items = safeGallery.filter(
      (g): g is InspirationImage & { id: string } =>
        !!g &&
        !g.localUri &&
        !g.isTemp &&
        typeof g.id === "string" &&
        !!g.image_url &&
        !String(g.image_url).startsWith("http") &&
        !String(g.image_url).startsWith("temp_")
    );
    if (items.length === 0) {
      setCarouselFullUrls({});
      return;
    }

    let cancelled = false;
    void (async () => {
      const urls = await fetchSignedStorageUrls(
        items.map((g) => ({ bucket: "inspirations", path: g.image_url }))
      );
      if (cancelled) return;
      const map: Record<string, string> = {};
      items.forEach((g, i) => {
        const u = urls[i];
        if (u) map[g.id] = u;
      });
      setCarouselFullUrls(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [modalVisible, carouselBatchKey, imageGallery]);

  const { mutateAsync: saveInspirationMutation } = useSaveInspirationToDatabase();
  const { profile, lastAppSurfacePref } = useAuth();
  const owner_id = profile?.id;

  /**
   * Hair / Nails / Brows are always available on the pro surface — you pick the shelf.
   * Data is still per logged-in profile + profession row (API); switching nail↔brow lane does not hide tabs.
   * Client surface keeps a single personal bucket (no category tabs).
   */
  const visibleFilterTabs =
    lastAppSurfacePref === "client" ? [] : CATEGORY_TABS;

  /** Invalidate inspiration cache only when switching client ↔ pro (not when switching pro lane). */
  const prevSurfaceRef = useRef<"client" | "pro" | null>(null);
  const posthog = usePostHog()

  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );

  // Image cropping state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [currentCropIndex, setCurrentCropIndex] = useState(0);

  const { refreshInspirationImages, deleteInspirationImages } = useImageContext();

  /** Cached server lists per profession — instant tab switches without clearing the grid. */
  const inspirationCacheRef = useRef<
    Partial<Record<InspirationProfession, InspirationImage[]>>
  >({});
  const [fetchingCategory, setFetchingCategory] =
    useState<InspirationProfession | null>(null);

  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  const selectCategory = useCallback(
    (code: InspirationProfession) => {
      if (code === inspirationCategory) return;
      inspirationCategoryRef.current = code;
      setInspirationCategory(code);

      const cached = inspirationCacheRef.current[code];
      setImageGallery(cached ?? []);

      if (cached === undefined) {
        setFetchingCategory(code);
      } else {
        setFetchingCategory(null);
      }

      void (async () => {
        const fresh = await refreshInspirationImages(
          true,
          inspirationFilterTabToProfessionCode(code)
        );
        inspirationCacheRef.current[code] = fresh;
        if (inspirationCategoryRef.current === code) {
          setImageGallery(fresh);
        }
        setFetchingCategory((prev) => (prev === code ? null : prev));
      })();
    },
    [refreshInspirationImages, setImageGallery, inspirationCategory]
  );

  useFocusEffect(
    useCallback(() => {
      if (uploadingImages.length > 0) return;
      if (!owner_id) return;

      let cancelled = false;

      void (async () => {
        const surfaceKey: "client" | "pro" =
          lastAppSurfacePref === "client" ? "client" : "pro";
        if (
          prevSurfaceRef.current !== null &&
          prevSurfaceRef.current !== surfaceKey
        ) {
          inspirationCacheRef.current = {};
        }
        prevSurfaceRef.current = surfaceKey;

        if (lastAppSurfacePref === "client") {
          inspirationCategoryRef.current = "hair";
          setInspirationCategory("hair");
          setFetchingCategory(null);
          const fresh = await refreshInspirationImages(
            true,
            CLIENT_INSPIRATION_PROFESSION_CODE
          );
          if (cancelled) return;
          setImageGallery(fresh);
          return;
        }

        const cat = inspirationCategoryRef.current;
        const cached = inspirationCacheRef.current[cat];
        setImageGallery(cached ?? []);

        if (cached === undefined) {
          setFetchingCategory(cat);
        } else {
          setFetchingCategory(null);
        }

        const fresh = await refreshInspirationImages(
          true,
          inspirationFilterTabToProfessionCode(cat)
        );
        inspirationCacheRef.current[cat] = fresh;
        if (cancelled) return;
        if (inspirationCategoryRef.current === cat) {
          setImageGallery(fresh);
        }
        setFetchingCategory((prev) => (prev === cat ? null : prev));
      })();

      return () => {
        cancelled = true;
      };
    }, [
      refreshInspirationImages,
      setImageGallery,
      uploadingImages.length,
      owner_id,
      lastAppSurfacePref,
    ])
  );

  useEffect(() => {
    if (selectedImages.length === 0 || buttonText === "Mark images") {
      setMarked(false);
    } else {
      setMarked(true);
    }
  }, [selectedImages, buttonText, setMarked]);

  useEffect(() => {
    if (buttonText === "Mark images") {
      setSelectedImages([]);
      setMarked(false);
    }
  }, [buttonText, setSelectedImages, setMarked]);

  const closeImageDetailModal = useCallback(() => {
    setModalVisible(false);
    setSelectedImage(null);
    setDetailDeleteAlertVisible(false);
    setDetailDeleteTargetPath(null);
    setDetailDeleteTargetId(null);
  }, [setSelectedImage]);

  const performDetailDelete = useCallback(async () => {
    const id = detailDeleteTargetId?.trim() || null;
    const path = toInspirationDeletePath(detailDeleteTargetPath ?? "");
    if (!id && (!path || path.startsWith("temp_"))) {
      setDetailDeleteAlertVisible(false);
      return;
    }
    try {
      setDetailDeleteAlertVisible(false);
      await deleteInspirationImages(
        id ? { ids: [id] } : { imageUrls: [path] }
      );
      const cat = inspirationCategoryRef.current;
      const code =
        lastAppSurfacePref === "client"
          ? CLIENT_INSPIRATION_PROFESSION_CODE
          : inspirationFilterTabToProfessionCode(cat);
      const fresh = await refreshInspirationImages(true, code);
      inspirationCacheRef.current[cat] = fresh;
      setImageGallery(fresh);
      closeImageDetailModal();
    } catch (error) {
      console.error("Detail delete error:", error);
      Alert.alert("Error", "Failed to delete image");
    }
  }, [
    detailDeleteTargetId,
    detailDeleteTargetPath,
    deleteInspirationImages,
    refreshInspirationImages,
    setImageGallery,
    closeImageDetailModal,
    lastAppSurfacePref,
  ]);

  const performDelete = async () => {
    try {
      console.log("About to delete:", selectedImages);

      const updatedGallery = imageGallery.filter(
        (img) => !selectedImages.includes(img.image_url)
      );
      setImageGallery(updatedGallery);
      inspirationCacheRef.current[inspirationCategoryRef.current] =
        updatedGallery;
      setButtonText("Mark images");
      setMarked(false);
      setSelectedImages([]);

      await deleteInspirationImages(selectedImages);

      console.log("Delete completed");
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", "Failed to delete images");
    }
  };

  const resizeImage = async (uri: string, width: number, quality: number) => {
    return await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
  };

  const processImageUpload = async (
    asset,
    tempId,
    filterTab: InspirationProfession
  ) => {
    try {
      setUploadProgress((prev) => ({ ...prev, [tempId]: 10 }));

      const [lowResImage, highResImage] = await Promise.all([
        resizeImage(asset.uri, 540, 0.72),
        resizeImage(asset.uri, 1200, 0.85),
      ]);

      setUploadProgress((prev) => ({ ...prev, [tempId]: 30 }));

      setUploadProgress((prev) => ({ ...prev, [tempId]: 50 }));

      const [lowResPath, highResPath] = await Promise.all([
        uploadToStorage(lowResImage.uri, "inspirations", undefined, "image/jpeg"),
        uploadToStorage(highResImage.uri, "inspirations", undefined, "image/jpeg"),
      ]);

      setUploadProgress((prev) => ({ ...prev, [tempId]: 70 }));

      if (!lowResPath || !highResPath) {
        throw new Error("Upload failed");
      }

      await saveInspirationMutation({
        owner_id,
        image_url: highResPath,
        low_res_image_url: lowResPath,
        high_middle_res_url: lowResPath,
        profession_code:
          lastAppSurfacePref === "client"
            ? CLIENT_INSPIRATION_PROFESSION_CODE
            : inspirationFilterTabToProfessionCode(filterTab),
      });

      setUploadProgress((prev) => ({ ...prev, [tempId]: 100 }));

      posthog.capture("Inspiration Saved", {
        user_id: profile?.id ?? "unknown",
      });

      return {
        success: true,
        tempId,
      };
    } catch (error) {
      console.error(`Error processing image upload:`, error);
      setUploadProgress((prev) => ({ ...prev, [tempId]: -1 }));
      return {
        success: false,
        tempId,
        error,
      };
    }
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera roll access is required");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      // Start cropping flow for selected images
      setPendingImages(result.assets);
      setCurrentCropIndex(0);
      setImageToCrop(result.assets[0].uri);
    } catch (error) {
      console.error("Error in pickImage:", error);
      Alert.alert("Error", "Failed to access image picker");
    }
  };

  // Store cropped images to be uploaded
  const [croppedAssets, setCroppedAssets] = useState<{ uri: string }[]>([]);

  const handleCropComplete = (croppedUri: string) => {
    // Add cropped image to the list
    const newCroppedAssets = [...croppedAssets, { uri: croppedUri }];
    setCroppedAssets(newCroppedAssets);

    // Check if there are more images to crop
    const nextIndex = currentCropIndex + 1;
    if (nextIndex < pendingImages.length) {
      // Move to next image
      setCurrentCropIndex(nextIndex);
      setImageToCrop(pendingImages[nextIndex].uri);
    } else {
      // All images cropped, now upload them
      setImageToCrop(null);
      setPendingImages([]);
      setCurrentCropIndex(0);
      uploadCroppedImages(newCroppedAssets);
      setCroppedAssets([]);
    }
  };

  const handleCropCancel = () => {
    // If we already have some cropped images, upload those
    if (croppedAssets.length > 0) {
      uploadCroppedImages(croppedAssets);
    }
    // Reset cropping state
    setImageToCrop(null);
    setPendingImages([]);
    setCurrentCropIndex(0);
    setCroppedAssets([]);
  };

  const uploadCroppedImages = async (assets: { uri: string }[]) => {
    if (assets.length === 0) return;

    /** Locked when the batch starts so parallel uploads + tab switches can't mix professions. */
    const professionLocked = inspirationCategoryRef.current;

    const uploadBatch = Date.now().toString();
    const tempIds = assets.map(
      () => `temp_${uploadBatch}_${randomUUID()}`
    );

    const tempImages = assets.map((asset, index) => ({
      id: tempIds[index],
      image_url: tempIds[index],
      low_res_image_url: asset.uri,
      low_middle_res_url: asset.uri,
      owner_id,
      isTemp: true,
      localUri: asset.uri,
      localUriAvailable: true,
      batchId: uploadBatch,
      uploadComplete: false,
    }));

    setImageGallery((prev) => [...tempImages, ...prev]);
    setUploadingImages((prev) => [...prev, ...tempIds]);

    const uploadPromises = assets.map((asset, index) =>
      processImageUpload(asset, tempIds[index], professionLocked)
    );

    const uploadResults = await Promise.all(uploadPromises);

    const successfulUploads = uploadResults.filter(
      (result) => result.success
    );
    if (successfulUploads.length > 0) {
      setTimeout(async () => {
        const refreshCode =
          lastAppSurfacePref === "client"
            ? CLIENT_INSPIRATION_PROFESSION_CODE
            : inspirationFilterTabToProfessionCode(professionLocked);
        const freshImages = await refreshInspirationImages(true, refreshCode);
        inspirationCacheRef.current[professionLocked] = freshImages;

        if (inspirationCategoryRef.current === professionLocked) {
          setImageGallery(freshImages);
        }

        successfulUploads.forEach((result) => {
          setUploadingImages((prev) =>
            prev.filter((id) => id !== result.tempId)
          );
        });
      }, 1000);
    }
  };

  const handleImagePress = (item: any) => {
    if (!item) return;
    if (buttonText === "Cancel") {
      setSelectedImages((prev) =>
        prev.includes(item.image_url)
          ? prev.filter((image) => image !== item.image_url)
          : [...prev, item.image_url]
      );
    } else {
      const index = imageGallery.findIndex(
        (img) => img.image_url === item.image_url
      );
      const start = index >= 0 ? index : 0;
      setStartingIndex(start);
      setCurrentIndex(start);
      setSelectedImage(item);
      setDetailDeleteTargetPath(
        typeof item.image_url === "string" ? item.image_url : null
      );
      setDetailDeleteTargetId(
        item.id != null && !item.isTemp ? String(item.id) : null
      );
      setModalVisible(true);
    }
  };

  /**
   * Always `replace` to the correct shell — do not `router.back()`. Opening inspiration
   * from the pro tab uses `replace("inspiration")`, so the stack would otherwise pop to
   * the wrong surface (e.g. client). Respect `lastAppSurfacePref` (set by tabs / switch account only).
   */
  const goHome = () => {
    const clientHome = "/(client)/(tabs)/home" as Href;
    const proHome = "/(hairdresser)/(tabs)/home" as Href;
    const proCapable = profileHasProfessionalCapability(profile ?? null);

    if (!proCapable) {
      router.replace(clientHome);
      return;
    }
    if (lastAppSurfacePref === "client") {
      router.replace(clientHome);
      return;
    }
    router.replace(proHome);
  };

  const safeGallery = Array.isArray(imageGallery) ? imageGallery : [];

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.topNav}>
          <InspirationTopNav title="My inspiration" goHome={goHome} />
        </View>

        {visibleFilterTabs.length > 0 ? (
          <View style={styles.filtersRow}>
            {visibleFilterTabs.map((tab) => {
              const active = inspirationCategory === tab.code;
              return (
                <Pressable
                  key={tab.code}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => selectCategory(tab.code)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Pressable
          style={[
            styles.addImageButton,
            buttonText !== "Mark images" && styles.addImageButtonDisabled,
          ]}
          onPress={buttonText === "Mark images" ? pickImage : undefined}
          disabled={buttonText !== "Mark images"}
        >
          <Plus size={responsiveScale(22)} color={primaryBlack} weight="bold" />
          <Text style={styles.addImageButtonText}>Add image</Text>
        </Pressable>

        {safeGallery.length > 0 && (
          <View style={styles.markCancelRow}>
            <MarkCancelButton
              onButtonChangetext={setButtonText}
              onDelete={() => {
                if (selectedImages.length > 0) {
                  setDeleteAlertVisible(true);
                }
              }}
            />
          </View>
        )}

        <CustomAlert
          visible={deleteAlertVisible}
          title="Confirm Deletion"
          message={`Delete ${selectedImages.length} selected image(s)?`}
          onClose={() => setDeleteAlertVisible(false)}
          fromDelete={true}
          onDelete={() => {
            setDeleteAlertVisible(false);
            performDelete();
          }}
        />

        <Modal
          animationType="slide"
          transparent
          visible={modalVisible}
          onRequestClose={closeImageDetailModal}
          {...(Platform.OS === "ios"
            ? { presentationStyle: "overFullScreen" as const }
            : {})}
          statusBarTranslucent
        >
          <View style={styles.detailModalRoot}>
            <SafeAreaView style={styles.detailModalSafe} edges={["bottom"]}>
              <StatusBar style="dark" />
              <View
                style={[
                  styles.detailModalHeader,
                  {
                    paddingTop:
                      Math.max(
                        safeInsets.top,
                        Platform.OS === "android"
                          ? RNStatusBar.currentHeight ?? 0
                          : 0
                      ) + responsiveScale(14),
                  },
                ]}
              >
                <InspirationTopNav
                  title="My inspiration"
                  onBack={closeImageDetailModal}
                />
              </View>

              {modalVisible && safeGallery.length > 0 ? (
                <View style={styles.detailCarouselSection}>
                  <View
                    style={[
                      styles.detailCarouselClip,
                      { height: detailCarouselViewportHeight, width },
                    ]}
                  >
                    <Carousel
                    key={`${startingIndex}-${String(selectedImage?.image_url ?? "")}`}
                    loop={false}
                    width={width}
                    height={detailCarouselViewportHeight}
                    autoPlay={false}
                    data={safeGallery}
                    onSnapToItem={(index) => {
                      setCurrentIndex(index);
                      const snapped = safeGallery[index];
                      setDetailDeleteTargetPath(
                        typeof snapped?.image_url === "string"
                          ? snapped.image_url
                          : null
                      );
                      setDetailDeleteTargetId(
                        snapped?.id != null && !snapped.isTemp
                          ? String(snapped.id)
                          : null
                      );
                    }}
                    defaultIndex={startingIndex}
                    renderItem={({ item }) => {
                      if (!item) return null;
                      const detailW = width - horizontalPadding * 2;
                      const imageBlockHeight = detailCarouselViewportHeight;

                      let inner: React.ReactNode = null;
                      if (item.localUri) {
                        inner = (
                          <OptimizedImage
                            directUrl={item.localUri}
                            sizePreset="fullscreen"
                            width={Math.ceil(detailW)}
                            style={styles.detailOptimizedImage}
                            contentFit="cover"
                            priority="high"
                            transition={0}
                          />
                        );
                      } else {
                        const idStr =
                          item.id != null ? String(item.id) : "";
                        const fullSigned =
                          idStr && carouselFullUrls[idStr]
                            ? carouselFullUrls[idStr]
                            : undefined;
                        const thumb =
                          typeof item.thumbnail_url === "string"
                            ? item.thumbnail_url.trim()
                            : "";
                        const rawPath =
                          item.image_url &&
                          !String(item.image_url).startsWith("http") &&
                          !String(item.image_url).startsWith("temp_")
                            ? String(item.image_url)
                            : undefined;
                        const displayUrl = fullSigned || thumb || undefined;
                        if (!displayUrl && !rawPath) return null;
                        inner = (
                          <OptimizedImage
                            directUrl={displayUrl || undefined}
                            path={
                              !displayUrl && rawPath ? rawPath : undefined
                            }
                            placeholderUri={
                              fullSigned &&
                              thumb &&
                              fullSigned !== thumb
                                ? thumb
                                : undefined
                            }
                            bucket="inspirations"
                            sizePreset="fullscreen"
                            width={Math.ceil(detailW)}
                            style={styles.detailOptimizedImage}
                            contentFit="cover"
                            priority="high"
                            transition={0}
                          />
                        );
                      }

                      return (
                        <View
                          style={[
                            styles.detailSlide,
                            { width, height: "100%" },
                          ]}
                        >
                          <View
                            style={[
                              styles.detailImageFrame,
                              {
                                width: detailW,
                                height: imageBlockHeight,
                              },
                            ]}
                          >
                            {inner}
                          </View>
                        </View>
                      );
                    }}
                  />
                  </View>
                </View>
              ) : null}

              <View style={styles.detailFooter}>
                <Pressable
                  style={styles.detailDeletePill}
                  onPress={() => {
                    const item = safeGallery[currentIndex];
                    if (!item) return;
                    if (item.isTemp) {
                      Alert.alert(
                        "Please wait",
                        "This image is still uploading."
                      );
                      return;
                    }
                    const p =
                      typeof item.image_url === "string"
                        ? item.image_url
                        : "";
                    setDetailDeleteTargetPath(p || null);
                    setDetailDeleteTargetId(
                      item.id != null && !item.isTemp ? String(item.id) : null
                    );
                    setDetailDeleteAlertVisible(true);
                  }}
                >
                  <X size={responsiveScale(22)} color={primaryBlack} weight="bold" />
                  <Text style={styles.detailDeleteLabel}>Delete</Text>
                </Pressable>
              </View>
            </SafeAreaView>

            <CustomAlert
              visible={detailDeleteAlertVisible}
              title="Delete inspiration"
              message="Delete this image? This cannot be undone."
              onClose={() => setDetailDeleteAlertVisible(false)}
              fromDelete={true}
              onDelete={() => {
                void performDetailDelete();
              }}
            />
          </View>
        </Modal>

        <View style={styles.galleryContainer}>
          <FlatList
            key="inspiration-grid"
            style={styles.galleryList}
            data={safeGallery}
            extraData={[
              uploadingImages,
              uploadProgress,
              selectedImages,
              carouselFullUrls,
            ]}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS === "android"}
            renderItem={({ item }) => {
              if (!item) return null;
              const thumb =
                typeof item.thumbnail_url === "string"
                  ? item.thumbnail_url.trim()
                  : "";
              const rawPath =
                item.image_url &&
                !String(item.image_url).startsWith("http") &&
                !String(item.image_url).startsWith("temp_")
                  ? String(item.image_url)
                  : undefined;
              if (!item.localUri && !thumb && !rawPath) return null;

              return (
                <Pressable
                  onPress={() => handleImagePress(item)}
                  style={[
                    styles.imageContainer,
                    { width: cellSize },
                    item.isTemp && styles.tempImageContainer,
                  ]}
                >
                  {item.localUriAvailable && item.localUri ? (
                    <Image
                      source={{ uri: item.localUri }}
                      style={[
                        styles.image,
                        styles.imageRounded,
                        {
                          width: cellSize,
                          height: cellSize,
                          opacity: selectedImages.includes(item.image_url)
                            ? 0.5
                            : 1,
                        },
                      ]}
                    />
                  ) : (
                    <OptimizedImage
                      directUrl={thumb || undefined}
                      path={!thumb && rawPath ? rawPath : undefined}
                      bucket="inspirations"
                      sizePreset="inspiration-grid"
                      width={Math.ceil(cellSize)}
                      recyclingKey={
                        item.id != null
                          ? String(item.id)
                          : String(item.image_url)
                      }
                      style={[
                        styles.image,
                        styles.imageRounded,
                        {
                          width: cellSize,
                          height: cellSize,
                          opacity: selectedImages.includes(item.image_url)
                            ? 0.5
                            : 1,
                        },
                      ]}
                      contentFit="cover"
                      priority="low"
                    />
                  )}

                  {/* Add upload progress indicator */}
                  {item.isTemp && uploadingImages.includes(item.image_url) && (
                    <View style={styles.tempImageOverlay}>
                      {uploadProgress[item.image_url] >= 0 ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.uploadErrorText}>Failed</Text>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            }}
            keyExtractor={(item, index) =>
              item?.id ? String(item.id) : `insp-${index}`
            }
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={{
              paddingHorizontal: horizontalPadding,
              gap: columnGap,
              marginBottom: columnGap,
            }}
            contentContainerStyle={styles.contentContainer}
            ListEmptyComponent={
              <View
                style={[
                  styles.emptyStateWrapper,
                  { minHeight: Math.max(screenHeight * 0.44, responsiveScale(300)) },
                ]}
              >
                <View style={styles.emptyStateCard}>
                  {fetchingCategory === inspirationCategory ? (
                    <>
                      <ActivityIndicator size="large" color={primaryBlack} />
                      <Text style={styles.emptyStateLoading}>Loading…</Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.emptyStateIconCircle}>
                        <Images
                          size={responsiveScale(36)}
                          color={primaryBlack}
                          weight="duotone"
                        />
                      </View>
                      <Text style={styles.emptyStateTitle}>
                        No inspiration yet
                      </Text>
                      <Text style={styles.emptyStateSubtitle}>
                        Build your{" "}
                        {
                          CATEGORY_TABS.find((t) => t.code === inspirationCategory)
                            ?.label
                        }{" "}
                        moodboard here. Use Add image above to save photos you
                        love.
                      </Text>
                    </>
                  )}
                </View>
              </View>
            }
          />
        </View>

        {/* Image Crop Modal */}
        {imageToCrop && (
          <ImageCropModal
            visible={!!imageToCrop}
            imageUri={imageToCrop}
            onCancel={handleCropCancel}
            onCropComplete={handleCropComplete}
          />
        )}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: primaryGreen },
  topNav: {
    paddingHorizontal: scalePercent(5),
    marginBottom: responsiveScale(4),
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: responsiveScale(10),
    paddingHorizontal: scalePercent(5),
    marginTop: responsiveScale(8),
  },
  filterPill: {
    paddingVertical: responsiveScale(10),
    paddingHorizontal: responsiveScale(20),
    borderRadius: responsiveBorderRadius(999),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
  },
  filterPillActive: {
    backgroundColor: primaryBlack,
    borderColor: primaryBlack,
  },
  filterPillText: {
    fontFamily: "Inter-Medium",
    fontSize: responsiveFontSize(16, 14),
    color: primaryBlack,
  },
  filterPillTextActive: {
    color: primaryWhite,
  },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: responsiveScale(8),
    marginTop: responsiveScale(18),
    paddingVertical: responsiveScale(12),
    paddingHorizontal: responsiveScale(22),
    borderRadius: responsiveBorderRadius(999),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
  },
  addImageButtonDisabled: {
    opacity: 0.35,
  },
  addImageButtonText: {
    fontFamily: "Inter-Medium",
    fontSize: responsiveFontSize(16, 14),
    color: primaryBlack,
  },
  markCancelRow: {
    alignItems: "flex-end",
    paddingHorizontal: scalePercent(5),
    marginTop: responsiveScale(10),
    minHeight: responsiveScale(36),
  },
  galleryContainer: {
    flex: 1,
    position: "relative",
    marginTop: responsiveScale(16),
    marginHorizontal: 0,
  },
  galleryList: {
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    borderRadius: responsiveBorderRadius(18),
    overflow: "hidden",
  },
  image: { resizeMode: "cover" },
  imageRounded: {
    borderRadius: responsiveBorderRadius(18),
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: responsiveScale(28),
  },
  emptyStateWrapper: {
    flexGrow: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scalePercent(5),
    paddingVertical: responsiveScale(24),
  },
  emptyStateCard: {
    width: "100%",
    maxWidth: responsiveScale(340),
    alignItems: "center",
    backgroundColor: primaryWhite,
    borderRadius: responsiveBorderRadius(22),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: `${primaryBlack}22`,
    paddingVertical: responsiveScale(32),
    paddingHorizontal: responsiveScale(26),
    /** Soft depth on green shell */
    shadowColor: primaryBlack,
    shadowOffset: { width: 0, height: responsiveScale(8) },
    shadowOpacity: 0.06,
    shadowRadius: responsiveScale(20),
    elevation: 3,
  },
  emptyStateIconCircle: {
    width: responsiveScale(72),
    height: responsiveScale(72),
    borderRadius: responsiveScale(36),
    backgroundColor: secondaryGreen,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: `${primaryBlack}18`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: responsiveScale(20),
  },
  emptyStateTitle: {
    ...Typography.anton16,
    textAlign: "center",
    marginBottom: responsiveScale(12),
    letterSpacing: 0.2,
  },
  emptyStateSubtitle: {
    ...Typography.bodySmall,
    textAlign: "center",
    color: `${primaryBlack}cc`,
    lineHeight: responsiveFontSize(22, 20),
    maxWidth: responsiveScale(280),
  },
  emptyStateLoading: {
    ...Typography.bodyMedium,
    textAlign: "center",
    marginTop: responsiveScale(16),
    color: `${primaryBlack}99`,
  },
  detailModalRoot: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  detailModalSafe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  detailModalHeader: {
    paddingHorizontal: scalePercent(5),
    zIndex: 50,
    elevation: 50,
  },
  detailCarouselSection: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: "center",
    minHeight: responsiveScale(200),
    overflow: "hidden",
  },
  detailCarouselClip: {
    alignSelf: "center",
    overflow: "hidden",
  },
  detailSlide: {
    justifyContent: "center",
    alignItems: "center",
  },
  detailImageFrame: {
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: responsiveBorderRadius(24),
    backgroundColor: primaryGreen,
  },
  detailOptimizedImage: {
    width: "100%",
    height: "100%",
  },
  detailFooter: {
    paddingBottom: responsiveScale(24),
    paddingTop: responsiveScale(12),
    alignItems: "center",
    zIndex: 20,
    elevation: 20,
  },
  detailDeletePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveScale(10),
    paddingVertical: responsiveScale(14),
    paddingHorizontal: responsiveScale(28),
    borderRadius: responsiveBorderRadius(999),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
  },
  detailDeleteLabel: {
    fontFamily: "Inter-Medium",
    fontSize: responsiveFontSize(16, 14),
    color: primaryBlack,
  },
  tempImageContainer: {
    position: "relative",
    borderWidth: 1,
    borderColor: "#dddddd",
    borderStyle: "dashed",
  },
  tempImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadErrorText: {
    color: "#ff3b30",
    fontWeight: "bold",
    fontSize: 12,
  },
});

export default MyInspiration;
