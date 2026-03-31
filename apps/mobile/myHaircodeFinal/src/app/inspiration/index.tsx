import React, { useState, useEffect, useCallback } from "react";
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
  ScrollView,
  Image as RNImage,
} from "react-native";
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
import { useImageContext } from "@/src/providers/ImageProvider";
import OptimizedImage from "@/src/components/OptimizedImage";
import ImageCropModal from "@/src/components/ImageCropModal";
import { fetchSignedStorageUrl } from "@/src/lib/storageSignedUrl";
import Carousel from "react-native-reanimated-carousel";
import CustomAlert from "@/src/components/CustomAlert";
import { Colors } from "@/src/constants/Colors";
import {
  responsiveScale,
  scalePercent,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
  responsiveBorderRadius,
  isTablet,
} from "@/src/utils/responsive";
import { usePostHog } from "posthog-react-native";

const MyInspiration = () => {
  const [numColumns, setNumColumns] = useState(3);
  const [flatListKey, setFlatListKey] = useState("flatlist-0");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startingIndex, setStartingIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [currentImageAspectRatio, setCurrentImageAspectRatio] = useState(1.3); // Default slightly taller than square
  const width = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const minCarouselRatio = (screenHeight * 0.57) / width; // Ensures ~57% of screen height minimum
  const size = width / numColumns;

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

  const {
    inspirationImages,
    imagesLoading,
    refreshInspirationImages,
    deleteInspirationImages,
  } = useImageContext();

  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  useEffect(() => {
    const updateNumColumns = () => {
      const screenWidth = Dimensions.get("window").width;
      const newNumColumns = Math.floor(screenWidth / 150);
      if (newNumColumns !== numColumns) {
        setNumColumns(newNumColumns);
        setFlatListKey(`flatlist-${newNumColumns}-${Date.now()}`);
      }
    };

    updateNumColumns();
    const subscription = Dimensions.addEventListener(
      "change",
      updateNumColumns
    );
    return () => subscription?.remove();
  }, [numColumns]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasInitiallyLoaded && uploadingImages.length === 0) {
        refreshImagesOnFocus();
      }
      return () => {};
    }, [hasInitiallyLoaded, uploadingImages])
  );

  const refreshImagesOnFocus = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await refreshInspirationImages();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 300);
  }, [refreshInspirationImages, isRefreshing]);

  useEffect(() => {
    if (selectedImages.length === 0 || buttonText === "Mark images") {
      setMarked(false);
    } else {
      setMarked(true);
    }
  }, [selectedImages, buttonText, setMarked]);

  useEffect(() => {
    if (isRefreshing || hasInitiallyLoaded) return;

    if (!Array.isArray(inspirationImages)) {
      setImageGallery([]);
      setHasInitiallyLoaded(true);
      return;
    }

    if (inspirationImages.length > 0) {
      setImageGallery(inspirationImages);
    } else {
      setImageGallery([]);
    }

    setHasInitiallyLoaded(true);
  }, [
    inspirationImages,
    isRefreshing,
    hasInitiallyLoaded,
    imagesLoading,
    setImageGallery,
  ]);

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
        const freshImages = await refreshInspirationImages();

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

  if (
    imagesLoading &&
    imageGallery.length === 0 &&
    uploadingImages.length === 0
  ) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const safeGallery = Array.isArray(imageGallery) ? imageGallery : [];

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.topNav}>
          <InspirationTopNav title="My inspiration" goHome={goHome} />
        </View>

        <View style={styles.rowContainer}>
          <Pressable
            style={[
              styles.plus,
              { opacity: buttonText === "Mark images" ? 1 : 0.2 },
            ]}
            onPress={buttonText === "Mark images" ? pickImage : null}
          >
            <Plus size={responsiveScale(32)} />
          </Pressable>

          <View style={styles.markCancel}>
            {safeGallery.length > 0 && (
              <MarkCancelButton
                onButtonChangetext={setButtonText}
                onDelete={() => {
                  if (selectedImages.length > 0) {
                    setDeleteAlertVisible(true);
                  }
                }}
              />
            )}
          </View>
        </View>

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
            key={flatListKey}
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
                    item.isTemp && styles.tempImageContainer, // Add this style
                  ]}
                >
                  {item.localUriAvailable && item.localUri ? (
                    <Image
                      source={{ uri }}
                      style={[
                        styles.image,
                        {
                          width: size,
                          height: size,
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
                        {
                          width: size,
                          height: size,
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
            numColumns={numColumns}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.contentContainer}
            ListEmptyComponent={
              <View style={styles.noInspirationContainer}>
                <Text style={styles.noInspirationText}>
                  {imagesLoading
                    ? "Loading..."
                    : "No inspiration has been added yet"}
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
  container: { flex: 1, backgroundColor: "#fff" },
  topNav: { margin: scalePercent(5) },
  row: { flex: 1, justifyContent: "flex-start", gap: 2 },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: scalePercent(5),
    marginBottom: scalePercent(3),
  },
  galleryContainer: {
    flex: 1,
    position: "relative",
    marginTop: 0,
    marginHorizontal: 0,
  },
  imageContainer: { position: "relative", aspectRatio: 1 },
  image: { resizeMode: "cover" },
  contentContainer: { flexGrow: 1, paddingTop: 2 },
  noInspirationText: {
    fontFamily: "Inter-Bold",
    fontSize: responsiveFontSize(18, 16),
    color: Colors.dark.warmGreen,
    textAlign: "center",
  },
  noInspirationContainer: {
    marginTop: scalePercent(10),
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    height: responsiveScale(300),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  plus: { flex: 1, alignItems: "center", marginLeft: scalePercent(34) },
  markCancel: {
    padding: responsivePadding(10),
    flex: 1,
    alignItems: "flex-end",
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
