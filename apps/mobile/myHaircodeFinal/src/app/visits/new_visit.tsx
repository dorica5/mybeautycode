import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, primaryBlack, primaryGreen } from "@/src/constants/Colors";
import {
  coerceProfessionCode,
  type ProfessionChoiceCode,
  HAIR_VISIT_SERVICE_OPTIONS,
  BROW_VISIT_SERVICE_OPTIONS,
} from "@/src/constants/professionCodes";
import { useActiveProfessionState } from "@/src/hooks/useActiveProfessionState";
import {
  NailVisitForm,
  NAIL_SERVICE_OPTIONS,
  VISIT_DESCRIPTION_MAX_CHARS,
} from "@/src/components/visits/NailVisitForm";
import { useLocalSearchParams } from "expo-router";
import DraggableModal from "@/src/components/DraggableModal";
import { VisitPreviewModalContent } from "@/src/components/visits/VisitPreviewModalContent";
import * as ImagePicker from "expo-image-picker";
import { fetchSignedStorageUrls } from "@/src/lib/storageSignedUrl";
import { randomUUID } from "expo-crypto";
import { api } from "@/src/lib/apiClient";
import { useAuth } from "@/src/providers/AuthProvider";
import { useSubmitHaircode } from "@/src/api/visits";
import {
  responsiveScale,
  scalePercent,
  responsiveFontSize,
  responsivePadding,
  responsiveBorderRadius,
} from "@/src/utils/responsive";
import { formatVisitDateForCountry } from "@/src/utils/formatVisitDateForCountry";
import { StatusBar } from "expo-status-bar";
import { usePostHog } from "posthog-react-native";
import ImageCropModal, {
  IMAGE_CROP_VIEWPORT_HEIGHT_RATIO,
} from "@/src/components/ImageCropModal";

function normalizeServicesFromParams(
  services: string | string[] | undefined
): string[] {
  if (services == null || services === "") return [];
  const raw = Array.isArray(services) ? services.join(", ") : String(services);
  return raw
    .split(", ")
    .map((s) => {
      const t = s.trim();
      if (t === "Color service") return "Color";
      return t;
    })
    .filter(Boolean);
}

function visitServiceOptionsForProfession(
  code: ProfessionChoiceCode
): readonly string[] {
  switch (code) {
    case "nails":
      return NAIL_SERVICE_OPTIONS;
    case "brows_lashes":
      return BROW_VISIT_SERVICE_OPTIONS;
    case "hair":
    case "esthetician":
      return HAIR_VISIT_SERVICE_OPTIONS;
  }
}

function firstRouteParam(
  v: string | string[] | undefined
): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

const NewVisit = () => {
  const params = useLocalSearchParams();
  console.log("Media params", params.media);
  const isEditing = Boolean(params.haircodeId);
  const { profile } = useAuth();
  const { clientId } = useLocalSearchParams();

  const [newHaircode, setNewHaircode] = useState(() => {
    const raw = params.description?.toString() ?? "";
    return raw.slice(0, VISIT_DESCRIPTION_MAX_CHARS);
  });
  const [price, setPrice] = useState(params.price?.toString() || "");
  const [selectedOptions, setSelectedOptions] = useState<string[]>(() =>
    normalizeServicesFromParams(params.services)
  );

  const [mediaToDelete, setMediaToDelete] = useState([]);
  const [capturedMedia, setCapturedMedia] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [originalMedia, setOriginalMedia] = useState([]);
  const [selectedOptionsString, setSelectedOptionsString] = useState<
    string | null
  >();
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);

  const screenHeight = Dimensions.get("window").height;
  const scrollViewRef = useRef<ScrollView>(null);
  const { mutate: submitHaircode, isPending } = useSubmitHaircode();
  const posthog = usePostHog();

  const {
    activeProfessionCode: storedLaneProfessionCode,
    storedProfessionReady,
  } = useActiveProfessionState(profile);

  const normalizedProfileProfessionCodes = useMemo((): ProfessionChoiceCode[] => {
    const out: ProfessionChoiceCode[] = [];
    const codes =
      profile?.profession_codes ??
      (profile as { professionCodes?: string[] | null } | null)?.professionCodes;
    for (const c of codes ?? []) {
      const n = coerceProfessionCode(c);
      if (n && !out.includes(n)) out.push(n);
    }
    return out;
  }, [profile]);

  const routeProfessionCode = useMemo(() => {
    const raw =
      firstRouteParam(params.professionCode as string | string[] | undefined) ??
      firstRouteParam(params.profession_code as string | string[] | undefined);
    return coerceProfessionCode(raw ?? undefined);
  }, [params.professionCode, params.profession_code]);

  const routeLaneMatchesProfile =
    Boolean(routeProfessionCode) &&
    (normalizedProfileProfessionCodes.length === 0 ||
      normalizedProfileProfessionCodes.includes(routeProfessionCode));

  /** Same lane as `visits/[id]` “New visit” — wins over AsyncStorage when passed & validated. */
  const activeProfessionCode = useMemo(() => {
    if (routeLaneMatchesProfile && routeProfessionCode)
      return routeProfessionCode;
    return storedLaneProfessionCode;
  }, [
    routeLaneMatchesProfile,
    routeProfessionCode,
    storedLaneProfessionCode,
  ]);

  const professionLaneReady =
    storedProfessionReady || routeLaneMatchesProfile;

  const [durationMinutes, setDurationMinutes] = useState<number>(
    params.duration ? parseInt(params.duration.toString()) : 0
  );
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  const formatDurationDisplay = (totalMinutes: number): string => {
    if (totalMinutes === 0) return "";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours > 0 ? `${hours}h ` : ""}${
      minutes > 0 ? `${minutes}m` : ""
    }`.trim();
  };

  const createDateFromMinutes = (totalMinutes: number): Date => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const getMinutesFromDate = (date: Date): number => {
    return date.getHours() * 60 + date.getMinutes();
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }

    if (selectedTime) {
      const totalMinutes = getMinutesFromDate(selectedTime);
      setDurationMinutes(totalMinutes);
    }
  };

  const dismissTimePicker = () => {
    setShowTimePicker(false);
  };

  useEffect(() => {
    if (!params.media) return;
    let cancelled = false;
    (async () => {
      try {
        const mediaData = JSON.parse(params.media.toString());
        if (cancelled) return;
        setOriginalMedia(mediaData);
        const uris = await fetchSignedStorageUrls(
          mediaData.map((item: { media_url: string }) => ({
            bucket: "haircode_images",
            path: item.media_url,
          }))
        );
        if (cancelled) return;
        const formattedMedia = mediaData
          .map(
            (
              item: {
                media_url: string;
                media_type: string;
                id: string;
              },
              i: number
            ) => ({
              uri: uris[i] ?? "",
              type: item.media_type,
              media_url: item.media_url,
              id: item.id,
              isFromDB: true,
            })
          )
          .filter((m: { uri: string }) => !!m.uri);
        setCapturedMedia(formattedMedia);
      } catch (error) {
        console.error("Error parsing media data:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.media]);

  const hasMediaChanged = () => {
    console.log("Checking if media changed...");
    console.log("Original media count:", originalMedia.length);
    console.log("Current media count:", capturedMedia.length);
    console.log("Media marked for deletion:", mediaToDelete);

    if (originalMedia.length !== capturedMedia.length) {
      console.log("Media changed: different count");
      return true;
    }

    if (mediaToDelete.length > 0) {
      console.log("Media changed: items marked for deletion");
      return true;
    }

    const hasNewItems = capturedMedia.some((m) => !m.isFromDB);
    if (hasNewItems) {
      console.log("Media changed: new items added");
      return true;
    }

    console.log("Media unchanged");
    return false;
  };

  const removeMedia = (index: number) => {
    if (capturedMedia[index] && capturedMedia[index].isFromDB) {
      setMediaToDelete((prev) => [...prev, capturedMedia[index].media_url]);
      console.log(
        `Marked media for deletion: ${capturedMedia[index].media_url}`
      );
    }
    setCapturedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionPress = (option: string) => {
    setSelectedOptions((prevSelectedOptions) =>
      prevSelectedOptions.includes(option)
        ? prevSelectedOptions.filter((item) => item !== option)
        : [...prevSelectedOptions, option]
    );
  };

  useEffect(() => {
    setSelectedOptionsString(selectedOptions.join(", "));
  }, [selectedOptions]);

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
    console.log(toggleModal);
  };

  const uploadMedia = async (index: number) => {
    if (!capturedMedia[index]) {
      console.error("No media found at index", index);
      return null;
    }

    const { uri, type, isFromDB, media_url } = capturedMedia[index];

    if (isFromDB && media_url) {
      console.log(`Reusing existing media: ${media_url}`);
      return media_url;
    }

    let fileExtension = "png";
    let contentType = "image/png";

    if (type === "video") {
      fileExtension = "mp4";
      contentType = "video/mp4";
    }

    if (!uri.startsWith("file://") && !uri.startsWith("content://")) {
      const pathMatch = uri.match(/haircode_images\/(.*)/);
      return pathMatch ? pathMatch[1] : uri;
    }

    try {
      console.log(`Uploading new media file: ${uri}`);
      const formData = new FormData();
      formData.append("file", {
        uri,
        type: contentType,
        name: `${randomUUID()}.${fileExtension}`,
      } as unknown as Blob);
      formData.append("bucket", "haircode_images");

      const result = await api.upload<{ path: string }>("/api/storage/upload", formData);
      console.log(`New media uploaded: ${result?.path}`);
      return result?.path ?? null;
    } catch (error) {
      console.error("Error processing media:", error);
      Alert.alert("Error", "Failed to process media file");
      return null;
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera roll access is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Store all selected images and show crop modal for the first one
      const imageUris = result.assets.map((asset) => asset.uri);
      setPendingImages(imageUris.slice(1)); // Store remaining images
      setImageToCrop(imageUris[0]); // Show crop modal for first image
    }
  };

  const handleCropComplete = (croppedUri: string) => {
    // Add the cropped image to captured media
    setCapturedMedia((prevMedia) => [
      ...prevMedia,
      {
        uri: croppedUri,
        type: "image",
      },
    ]);

    // Check if there are more images to crop
    if (pendingImages.length > 0) {
      setImageToCrop(pendingImages[0]);
      setPendingImages(pendingImages.slice(1));
    } else {
      setImageToCrop(null);
    }
  };

  const handleCropCancel = () => {
    // If user cancels, skip all remaining images
    setImageToCrop(null);
    setPendingImages([]);
  };

  const handleSubmit = async () => {
    if (!activeProfessionCode) {
      Alert.alert(
        "Error",
        "Could not determine which profession account this visit is for. Try again."
      );
      return;
    }
    try {
      await submitHaircode({
        isEditing,
        params,
        newHaircode,
        selectedOptions,
        price,
        duration: durationMinutes,
        capturedMedia,
        mediaToDelete,
        profile,
        clientId,
        uploadMedia,
        hasMediaChanged,
        professionCode: activeProfessionCode,
      });

      posthog.capture("Visit Added", {
        hairdresser_id: profile?.id ?? "unknown",
        client_id: clientId ?? "unknown",
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      Alert.alert("Error", "Something went wrong.");
    }
  };

  const previewHasMedia = capturedMedia.some((m) => Boolean(m?.uri));
  /** Text-only preview is shorter; with media leave comfortable gap below status bar. */
  const visitPreviewModalHeight = previewHasMedia
    ? screenHeight * 0.85
    : screenHeight * 0.58;

  const visitDateLabel = formatVisitDateForCountry(
    new Date(),
    profile?.country
  );
  const visitPreviewBaseProps = {
    onClose: toggleModal,
    visitTitle: `Visit ${visitDateLabel}`,
    dateText: visitDateLabel,
    serviceText: selectedOptionsString ?? "",
    commentText: newHaircode,
    durationText:
      durationMinutes > 0 ? formatDurationDisplay(durationMinutes) : "",
    priceText: price.trim(),
    profile,
    capturedMedia,
    carouselHeight: screenHeight * IMAGE_CROP_VIEWPORT_HEIGHT_RATIO,
  };

  const visitPreviewModal =
    activeProfessionCode != null ? (
      <VisitPreviewModalContent
        {...visitPreviewBaseProps}
        professionCode={activeProfessionCode}
      />
    ) : null;

  if (
    !profile?.id ||
    !professionLaneReady ||
    activeProfessionCode === null
  ) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: primaryGreen,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={primaryBlack} />
      </View>
    );
  }

  const visitServiceOptions =
    visitServiceOptionsForProfession(activeProfessionCode);

  return (
    <>
      <StatusBar style="dark" backgroundColor={primaryGreen} />
      <SafeAreaView style={styles.nailSafeArea}>
        <NailVisitForm
          scrollRef={scrollViewRef}
          serviceOptions={visitServiceOptions}
          isEditing={isEditing}
          selectedOptions={selectedOptions}
          onToggleService={handleOptionPress}
          newHaircode={newHaircode}
          onChangeDescription={setNewHaircode}
          durationMinutes={durationMinutes}
          showTimePicker={showTimePicker}
          onTimePickerOpen={() => setShowTimePicker(true)}
          onTimePickerDismiss={dismissTimePicker}
          onNativeTimeChange={onTimeChange}
          formatDurationDisplay={formatDurationDisplay}
          createDateFromMinutes={createDateFromMinutes}
          price={price}
          onChangePrice={setPrice}
          capturedMedia={capturedMedia}
          pickImage={pickImage}
          removeMedia={removeMedia}
          isPending={isPending}
          isUploadingMedia={isUploadingMedia}
          onSave={handleSubmit}
          onPreviewPress={toggleModal}
        />
      </SafeAreaView>
      <DraggableModal
        isVisible={isModalVisible}
        onClose={toggleModal}
        modalHeight={visitPreviewModalHeight}
        renderContent={visitPreviewModal}
        sheetBackgroundColor={primaryGreen}
      />
      <ImageCropModal
        visible={imageToCrop !== null}
        imageUri={imageToCrop || ""}
        onCancel={handleCropCancel}
        onCropComplete={handleCropComplete}
      />
    </>
  );
};

export default NewVisit;
const styles = StyleSheet.create({
  nailSafeArea: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  container: {
    flex: 1,
    margin: scalePercent(5),
    flexDirection: "column",
    justifyContent: "space-between",
  },
  topNavContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scalePercent(1),
  },
  caretLeftContainer: {
    justifyContent: "flex-start",
  },
  topTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  topText: {
    fontSize: responsiveFontSize(20, 16),
    fontFamily: "Inter-SemiBold",
    textAlign: "center",
    marginLeft: scalePercent(6),
  },
  previewContainer: {
    justifyContent: "flex-end",
  },
  preview: {
    fontSize: responsiveFontSize(14, 12),
    fontFamily: "Inter-SemiBold",
    color: "#ED1616",
  },
  options: {
    marginTop: scalePercent(2),
    padding: responsivePadding(12),
    backgroundColor: Colors.dark.yellowish,
    borderRadius: responsiveBorderRadius(20),
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    width: scalePercent(90),
  },
  optionHaircut: {
    marginTop: scalePercent(3),
    padding: responsivePadding(12),
    backgroundColor: Colors.dark.yellowish,
    borderRadius: responsiveBorderRadius(20),
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    width: scalePercent(90),
  },
  selectedOption: {
    backgroundColor: Colors.dark.warmGreen,
  },
  optionText: {
    fontFamily: "Inter-SemiBold",
    fontSize: responsiveFontSize(16, 14),
  },
  text: {
    marginTop: scalePercent(5),
    padding: responsivePadding(20),
    fontSize: responsiveFontSize(15, 13),
    fontFamily: "Inter-SemiBold",
    borderRadius: responsiveBorderRadius(20),
  },
  inputDescribe: {
    marginTop: scalePercent(5),
    padding: responsivePadding(20),
    backgroundColor: Colors.dark.yellowish,
    borderRadius: responsiveBorderRadius(20),
    margin: "0%",
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(14, 10),
    width: scalePercent(90),
    height: responsiveScale(150, 180),
    alignSelf: "center",
    textAlignVertical: "top",
    color: Colors.dark.dark,
  },
  iosInput: {
    padding: responsivePadding(20),
    textAlignVertical: "top",
  },

  androidInput: {
    paddingHorizontal: responsivePadding(20),
    textAlignVertical: "center",
  },
  inputPrice: {
    marginTop: scalePercent(4),
    backgroundColor: Colors.dark.yellowish,
    borderRadius: responsiveBorderRadius(20),
    margin: "0%",
    fontFamily: "Inter-Regular",
    width: scalePercent(90),
    height: responsiveScale(50, 60),
    alignSelf: "center",
    color: Colors.dark.dark,
    fontSize: responsiveFontSize(14, 10)
  },

  newHaircode: {
    textAlign: "center",
    fontSize: responsiveFontSize(14, 12),
    width: scalePercent(60),
    marginBottom: 0,
    marginTop: scalePercent(5),
  },

  labelContainerPrice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: responsiveScale(20),
    marginRight: responsiveScale(20),
    width: scalePercent(90),
  },

  infoIcon: {
    marginTop: responsiveScale(17, 35),
    marginLeft: responsiveScale(-5),
    color: Colors.dark.dark,
  },
  iconContainer: {
    marginLeft: responsiveScale(-20),
    padding: responsiveScale(20, 5),
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsiveScale(-12),
  },

  cameraButtonRow: {
    marginTop: "0%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: responsiveScale(20),
  },
  bottomSpacer: {
    flex: 1,
  },
  addHaircodeButton: {
    marginTop: scalePercent(8),
    paddingVertical: responsiveScale(12),
    borderWidth: responsiveScale(2),
    borderColor: Colors.light.warmGreen,
    backgroundColor: "transparent",
    width: scalePercent(88),
    height: responsiveScale(50, 60),
    alignSelf: "center",
  },
  services: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: scalePercent(5),
  },
  servicesText: {
    fontFamily: "Inter-SemiBold",
    fontSize: responsiveFontSize(14, 12),
    paddingHorizontal: responsiveScale(15),
    marginTop: responsiveScale(-20),
    marginBottom: responsiveScale(-20),
  },
  carouselContainer: {
    marginVertical: scalePercent(-2),
  },
  modalImage: {
    width: "100%",
    height: Dimensions.get("window").height * 0.6,  // Match crop and single_visit height (60% of screen)
  },
  priceTextPreview: {
    fontFamily: "Inter-SemiBold",
    fontSize: responsiveFontSize(14, 12),
    paddingHorizontal: responsiveScale(15),
    marginTop: responsiveScale(10),
    color: Colors.dark.dark,
  },
  hairdresserRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: responsiveScale(15),
    marginTop: scalePercent(5),
  },
  profileImage: {
    width: responsiveScale(50),
    height: responsiveScale(50),
    borderRadius: responsiveScale(25),
  },
  hairdresserText: {
    flex: 1,
    fontSize: responsiveFontSize(16, 14),
    color: Colors.dark.dark,
    fontFamily: "Inter-SemiBold",
    marginLeft: responsiveScale(10),
  },

  descriptionSection: {
    marginTop: "0%",
  },
  description: {
    marginTop: scalePercent(5),
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(14, 12),
    paddingHorizontal: responsiveScale(15),
  },
  camera: {
    backgroundColor: Colors.light.yellowish,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: responsiveBorderRadius(10),
    margin: responsiveScale(10, 20),
    width: scalePercent(17),
    height: scalePercent(17),
  },
  image: {
    width: scalePercent(17),
    height: scalePercent(17),
    borderRadius: responsiveBorderRadius(10),
  },
  customStyle: {
    marginLeft: responsiveScale(10),
  },
  carouselWrapper: {
    marginTop: scalePercent(5),
    marginBottom: scalePercent(5),
  },
  noMediaContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  deleteIconContainer: {
    position: "absolute",
    top: responsiveScale(2),
    right: responsiveScale(2),
    zIndex: 10,
    padding: responsiveScale(2),
  },
  iconBackground: {
    position: "absolute",
    top: responsiveScale(2),
    right: responsiveScale(2),
    zIndex: 10,
    padding: responsiveScale(2),
  },
  previewDots: {
    marginTop: responsiveScale(10),
  },
  defaultImage: {
    width: responsiveScale(50),
    height: responsiveScale(50),
    borderRadius: responsiveScale(25),
    backgroundColor: Colors.dark.yellowish,
    justifyContent: "center",
    alignItems: "center",
  },
  extraPadding: {
    paddingVertical: responsiveScale(10),
    justifyContent: "center",
    alignSelf: "center",
  },
  filledInput: {},
  placeholder: {
    color: "rgba(0, 0, 0, 0.5)",
    fontSize: responsiveFontSize(14, 12),
  },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#00000066",
  },
  timePickerContainer: {
    backgroundColor: Colors.dark.yellowish,
    borderRadius: responsiveBorderRadius(20),
    marginTop: responsiveScale(10),
    paddingVertical: responsiveScale(10),
  },
  timePicker: {
    height: responsiveScale(120),
  },
  timePickerButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: responsiveScale(20),
    paddingBottom: responsiveScale(10),
  },
  timePickerButton: {
    paddingHorizontal: responsiveScale(20),
    paddingVertical: responsiveScale(8),
    backgroundColor: Colors.dark.warmGreen,
    borderRadius: responsiveBorderRadius(10),
  },
  timePickerButtonText: {
    color: "white",
    fontFamily: "Inter-SemiBold",
    fontSize: responsiveFontSize(14, 12),
  },
  doneButton: {
    marginTop: responsiveScale(20),
    width: scalePercent(90),
    alignSelf: "center",
  },
});