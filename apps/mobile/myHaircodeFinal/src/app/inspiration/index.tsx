import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Image as RNImage,
} from "react-native";
import { randomUUID } from "expo-crypto";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import InspirationTopNav from "@/src/components/InspirationTopNav";
import MarkCancelButton from "@/src/components/MarkCancelButton";
import { Plus, XCircle } from "phosphor-react-native";
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
import { fetchSignedStorageUrl } from "@/src/lib/storageSignedUrl";
import Carousel from "react-native-reanimated-carousel";
import CustomAlert from "@/src/components/CustomAlert";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import {
  responsiveScale,
  scalePercent,
  responsiveFontSize,
  responsiveBorderRadius,
} from "@/src/utils/responsive";
import { usePostHog } from "posthog-react-native";

const NUM_COLUMNS = 2;

type InspirationProfession = "hair" | "nails" | "brows";

const CATEGORY_TABS: { code: InspirationProfession; label: string }[] = [
  { code: "hair", label: "Hair" },
  { code: "nails", label: "Nails" },
  { code: "brows", label: "Brows" },
];

const MyInspiration = () => {
  const [inspirationCategory, setInspirationCategory] =
    useState<InspirationProfession>("hair");
  const inspirationCategoryRef = useRef<InspirationProfession>("hair");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startingIndex, setStartingIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [currentImageAspectRatio, setCurrentImageAspectRatio] = useState(1.3); // Default slightly taller than square
  const width = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const minCarouselRatio = (screenHeight * 0.57) / width; // Ensures ~57% of screen height minimum
  const horizontalPadding = scalePercent(5);
  const columnGap = responsiveScale(12);
  const gridInnerWidth = width - horizontalPadding * 2;
  const cellSize = (gridInnerWidth - columnGap) / NUM_COLUMNS;

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

  const { mutateAsync: saveInspirationMutation } = useSaveInspirationToDatabase();
  const { profile } = useAuth();
  const owner_id = profile?.id;
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
        const fresh = await refreshInspirationImages(true, code);
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

      const cat = inspirationCategoryRef.current;
      const cached = inspirationCacheRef.current[cat];
      setImageGallery(cached ?? []);

      let cancelled = false;

      if (cached === undefined) {
        setFetchingCategory(cat);
      }

      void (async () => {
        const fresh = await refreshInspirationImages(true, cat);
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
    }, [refreshInspirationImages, setImageGallery, uploadingImages.length])
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

  const processImageUpload = async (asset, tempId) => {
    try {
      setUploadProgress((prev) => ({ ...prev, [tempId]: 10 }));

      const [lowResImage, highResImage] = await Promise.all([
        resizeImage(asset.uri, 200, 0.6),
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
        profession_code: inspirationCategoryRef.current,
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
      processImageUpload(asset, tempIds[index])
    );

    const uploadResults = await Promise.all(uploadPromises);

    const successfulUploads = uploadResults.filter(
      (result) => result.success
    );
    if (successfulUploads.length > 0) {
      setTimeout(async () => {
        // Refresh from database
        const cat = inspirationCategoryRef.current;
        const freshImages = await refreshInspirationImages(true, cat);
        inspirationCacheRef.current[cat] = freshImages;

        // Update local gallery with fresh data
        setImageGallery(freshImages);

        // Clean up uploading state
        successfulUploads.forEach((result) => {
          setUploadingImages((prev) =>
            prev.filter((id) => id !== result.tempId)
          );
        });
      }, 1000);
    }
  };

  // Calculate aspect ratio for current image
  const calculateImageAspectRatio = async (imageUri: string) => {
    const isLocalUri =
      imageUri.startsWith("file://") || imageUri.startsWith("content://");
    const isFullUrl = imageUri.startsWith("http");

    let fullUrl: string;
    if (isLocalUri || isFullUrl) {
      fullUrl = imageUri;
    } else {
      fullUrl = (await fetchSignedStorageUrl("inspirations", imageUri)) ?? "";
    }

    if (!fullUrl) {
      setCurrentImageAspectRatio(1.3);
      return;
    }

    RNImage.getSize(
      fullUrl,
      (imgWidth, imgHeight) => {
        const aspectRatio = imgHeight / imgWidth;
        const boundedRatio = Math.max(minCarouselRatio, Math.min(aspectRatio, 3));
        setCurrentImageAspectRatio(boundedRatio);
      },
      (error) => {
        console.error("Error getting image size:", error);
        setCurrentImageAspectRatio(1.3);
      }
    );
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
      setStartingIndex(index >= 0 ? index : 0);
      setSelectedImage(item);
      setModalVisible(true);

      // Calculate aspect ratio for selected image
      const uri = item.localUri || item.full_url || item.image_url;
      if (uri) {
        void calculateImageAspectRatio(uri);
      }
    }
  };

  const goHome = () => {
    if (profile.user_type === "CLIENT") {
      router.replace("/(client)/home" as Href);
    } else if (profile.user_type === "HAIRDRESSER") {
      router.replace("/(hairdresser)/home" as Href);
    }
  };

  const safeGallery = Array.isArray(imageGallery) ? imageGallery : [];

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.topNav}>
          <InspirationTopNav title="My inspiration" goHome={goHome} />
        </View>

        <View style={styles.filtersRow}>
          {CATEGORY_TABS.map((tab) => {
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
          animationType="fade"
          transparent
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(false);
            setSelectedImage(null);
          }}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              setModalVisible(false);
              setSelectedImage(null);
            }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => {
                    setModalVisible(false);
                    setSelectedImage(null);
                  }}
                >
                  <XCircle
                    size={responsiveScale(30)}
                    color="#fff"
                  />
                </Pressable>

                {modalVisible && selectedImage && safeGallery.length > 0 && (
                  <Carousel
                    loop
                    width={width}
                    height={screenHeight * 0.6}
                    autoPlay={false}
                    data={safeGallery}
                    onSnapToItem={(index) => {
                      setCurrentIndex(index);
                    }}
                    defaultIndex={startingIndex}
                    renderItem={({ item }) => {
                      if (!item) return null;
                      const uri =
                        item.localUri || item.full_url || item.image_url;
                      if (!uri) return null;

                      const isLocalUri = uri.startsWith("file://") || uri.startsWith("content://");
                      const isFullUrl = uri.startsWith("http");

                      return (
                        <OptimizedImage
                          {...(isLocalUri || isFullUrl
                            ? { directUrl: uri }
                            : { path: uri, bucket: "inspirations", twoStageLoading: true }
                          )}
                          style={styles.enlargedImage}
                          contentFit="cover"
                          contentPosition="top"
                        />
                      );
                    }}
                  />
                )}
              </View>
            </View>
          </Pressable>
        </Modal>

        <View style={styles.galleryContainer}>
          <FlatList
            key="inspiration-grid"
            data={safeGallery}
            extraData={[uploadingImages, uploadProgress, selectedImages]}
            renderItem={({ item }) => {
              if (!item) return null;
              const uri =
                item.localUri ||
                item.thumbnail_url ||
                item.full_url ||
                item.image_url;
              if (!uri) return null;

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
                      source={{ uri }}
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
                      directUrl={uri}
                      bucket="inspirations"
                      sizePreset="inspiration-grid"
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
            columnWrapperStyle={[
              styles.row,
              { paddingHorizontal: horizontalPadding, gap: columnGap },
            ]}
            contentContainerStyle={styles.contentContainer}
            ListEmptyComponent={
              <View style={styles.noInspirationContainer}>
                <Text style={styles.noInspirationText}>
                  {fetchingCategory === inspirationCategory
                    ? "Loading…"
                    : "No images yet. Tap Add image to add inspiration for this category."}
                </Text>
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
  row: {},
  galleryContainer: {
    flex: 1,
    position: "relative",
    marginTop: responsiveScale(16),
    marginHorizontal: 0,
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
    paddingBottom: responsiveScale(100),
  },
  noInspirationText: {
    fontFamily: "Inter-Medium",
    fontSize: responsiveFontSize(17, 15),
    color: primaryBlack,
    textAlign: "center",
    lineHeight: responsiveFontSize(24, 22),
    paddingHorizontal: scalePercent(8),
  },
  noInspirationContainer: {
    marginTop: scalePercent(12),
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    minHeight: responsiveScale(280),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#000",
    borderRadius: responsiveBorderRadius(10),
    overflow: "hidden",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: responsiveScale(10),
    right: responsiveScale(10),
    zIndex: 1,
  },
  enlargedImage: {
    width: "100%",
    height: "100%",
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
