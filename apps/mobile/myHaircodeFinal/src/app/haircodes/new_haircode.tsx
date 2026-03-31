import React, { useEffect, useRef, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  Dimensions,
  Keyboard,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Camera,
  CaretLeft,
  VideoCamera,
  Info,
  XCircle,
  UserCircle,
} from "phosphor-react-native";
import { Colors } from "@/src/constants/Colors";
import { router, useLocalSearchParams } from "expo-router";
import MyButton from "@/src/components/MyButton";
import DraggableModal from "@/src/components/DraggableModal";
import Carousel from "react-native-reanimated-carousel";
import Dots from "react-native-dots-pagination";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { fetchSignedStorageUrls } from "@/src/lib/storageSignedUrl";
import { randomUUID } from "expo-crypto";
import { api } from "@/src/lib/apiClient";
import { useAuth } from "@/src/providers/AuthProvider";
import { ResizeMode, Video } from "expo-av";
import { useClientSearch } from "@/src/api/profiles";
import AddButton from "@/src/components/AddButton";
import CustomAlert from "@/src/components/CustomAlert";
import NoImageHaircode from "@/src/components/no_image_haircode";
import { useSubmitHaircode } from "@/src/api/haircodes";
import RemoteImage from "@/src/components/RemoteImage";
import { sendPushNotification } from "@/src/providers/useNotifcations";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import {
  responsiveScale,
  scalePercent,
  responsiveFontSize,
  responsivePadding,
  responsiveBorderRadius,
  isTablet,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { usePostHog } from "posthog-react-native";
import ImageCropModal from "@/src/components/ImageCropModal";

const NewHaircode = () => {
  const params = useLocalSearchParams();
  console.log("Media params", params.media);
  const isEditing = Boolean(params.haircodeId);
  const { profile } = useAuth();
  const { clientId } = useLocalSearchParams();

  const [newHaircode, setNewHaircode] = useState(
    params.description?.toString() || ""
  );
  const [price, setPrice] = useState(params.price?.toString() || "");
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    params.services ? params.services.toString().split(", ") : []
  );

  const [mediaToDelete, setMediaToDelete] = useState([]);
  const [capturedMedia, setCapturedMedia] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [originalMedia, setOriginalMedia] = useState([]);
  const [selectedOptionsString, setSelectedOptionsString] = useState<
    string | null
  >();
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertVisible2, setAlertVisible2] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);

  const width = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const scrollViewRef = useRef<ScrollView>(null);
  const { mutate: submitHaircode, isPending } = useSubmitHaircode();
  const posthog = usePostHog()

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

  useEffect(() => {
    setSelectedOptionsString(selectedOptions.join(", "));
  }, [selectedOptions]);

  const getCurrentDateFormatted = () => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);
    return `${day}.${month}.${year}`;
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

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCapturedMedia((prevMedia) => [
        ...prevMedia,
        ...result.assets.map((asset) => ({
          uri: asset.uri,
          type: "video",
        })),
      ]);
    }
  };

  const handleSubmit = async () => {
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
      });

      posthog.capture("Haircode Added", {
        hairdresser_id: profile?.id ?? "unknown",
        client_id: clientId ?? "unknown",
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      Alert.alert("Error", "Something went wrong.");
    }
  };

  const generateMediaList = () => {
    const mediaList = [...capturedMedia];
    while (mediaList.length < 4) {
      mediaList.push({ type: "placeholder" });
    }
    return mediaList;
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    if (showTimePicker) {
      setShowTimePicker(false);
    }
  };

  const modalContent = (
    <View style={{ flex: 1 }}>
      {/* Fixed header section */}
      <View style={styles.services}>
        <Text style={styles.servicesText}>{selectedOptionsString}</Text>
        <Text style={styles.servicesText}>{getCurrentDateFormatted()}</Text>
      </View>

      {/* Fixed carousel section */}
      <View style={[styles.carouselWrapper, { height: screenHeight * 0.6 }]}>
        <Carousel
          loop
          width={width}
          height={screenHeight * 0.6}
          autoPlay={false}
          data={
            capturedMedia.length > 0
              ? capturedMedia
              : selectedOptions.length > 0
              ? selectedOptions
              : ["HairDryer"]
          }
          onSnapToItem={(index) => setCurrentIndex(index)}
          scrollAnimationDuration={100}
          enabled={true}
          renderItem={({ index }) => {
            if (capturedMedia.length === 0) {
              const service = selectedOptions[index] || "HairDryer";
              const iconType =
                service === "Haircut"
                  ? "Scissors"
                  : service === "Color service"
                  ? "PaintBrush"
                  : "HairDryer";

              return (
                <View style={styles.noMediaContainer}>
                  <NoImageHaircode iconType={iconType} />
                </View>
              );
            }

            return capturedMedia[index]?.type === "image" ? (
              <Image
                source={{ uri: capturedMedia[index].uri }}
                style={styles.modalImage}
                resizeMode="cover"
              />
            ) : (
              <Video
                source={{ uri: capturedMedia[index].uri }}
                style={styles.modalImage}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
              />
            );
          }}
          style={styles.carouselContainer}
        />
      </View>

      {/* Fixed dots section */}
      <View style={styles.previewDots}>
        <Dots
          length={
            capturedMedia.length > 0
              ? capturedMedia.length
              : selectedOptions.length > 0
              ? selectedOptions.length
              : 1
          }
          active={currentIndex}
          activeDotWidth={10}
          passiveDotWidth={8}
          activeColor={Colors.dark.warmGreen}
          passiveColor={"rgba(0,0,0,0.2)"}
        />
      </View>

      {/* Scrollable content section - with flex: 1 to take remaining space */}
      <ScrollView
        showsVerticalScrollIndicator={true}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: responsiveScale(80) }}
        bounces={true}
      >
        <View style={styles.hairdresserRow}>
          {profile.avatar_url ? (
            <AvatarWithSpinner 
              uri={profile.avatar_url} 
              size={responsiveScale(50)} 
              style={styles.profileImage} 
            />
          ) : (
            <View style={styles.defaultImage}>
              <UserCircle size={responsiveScale(32)} color={Colors.dark.dark} weight="regular" />
            </View>
          )}

          <Text style={styles.hairdresserText}>
            {profile.full_name}, {profile.salon_name}
          </Text>
        </View>

        {durationMinutes > 0 && (
          <Text style={styles.priceTextPreview}>
            Duration: {formatDurationDisplay(durationMinutes)}
          </Text>
        )}
        <Text style={styles.priceTextPreview}>Price: {price}</Text>

        <Text style={styles.description}>{newHaircode}</Text>

        <View style={styles.doneButton}>
          <MyButton 
            text="Done" 
            onPress={toggleModal} 
            textSize={18}
            textTabletSize={14}
          />
        </View>
      </ScrollView>
    </View>
  );

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.topNavContainer}>
            <Pressable
              onPress={() => router.back()}
              style={styles.caretLeftContainer}
            >
              <CaretLeft size={responsiveScale(32)} />
            </Pressable>

            <View style={styles.topTextContainer}>
              <Text style={styles.topText}>
                {isEditing ? "Edit Haircode" : "New Haircode"}
              </Text>
            </View>

            <Pressable onPress={toggleModal} style={styles.previewContainer}>
              <Text style={styles.preview}>Preview</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: responsiveScale(40) }}
          >
            <Pressable onPress={dismissKeyboard} style={{ flex: 1 }}>
              <View>
                <Text style={styles.text}>What service has been done?</Text>
              </View>

              <Pressable
                style={[
                  styles.optionHaircut,
                  selectedOptions.includes("Haircut") && styles.selectedOption,
                ]}
                onPress={() => handleOptionPress("Haircut")}
              >
                <Text style={styles.optionText}>Haircut</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.options,
                  selectedOptions.includes("Color service") &&
                    styles.selectedOption,
                ]}
                onPress={() => handleOptionPress("Color service")}
              >
                <Text style={styles.optionText}>Color service</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.options,
                  selectedOptions.includes("Other") && styles.selectedOption,
                ]}
                onPress={() => handleOptionPress("Other")}
              >
                <Text style={styles.optionText}>Other</Text>
              </Pressable>

              <View>
                <View style={styles.rowContainer}>
                  <Text style={styles.text}>Describe the service</Text>

                  <Pressable
                    onPress={() => setAlertVisible(true)}
                    style={styles.iconContainer}
                  >
                    <Info
                      size={responsiveScale(20)}
                      color="#687076"
                      style={styles.infoIcon}
                    />
                  </Pressable>
                  <CustomAlert
                    visible={alertVisible}
                    title="Service description"
                    message="Description will only be visible to you and other hairdressers your client has approved."
                    onClose={() => setAlertVisible(false)}
                  />
                </View>

                <View style={{ alignItems: "flex-start" }}>
                  <TextInput
                    style={styles.inputDescribe}
                    multiline
                    numberOfLines={4}
                    placeholder="Describe the service"
                    placeholderTextColor="rgba(0, 0, 0, 0.5)"
                    onChangeText={setNewHaircode}
                    value={newHaircode}
                  />
                </View>
              </View>

              <View style={{ alignItems: "flex-start" }}>
                <Text style={styles.text}>Time used</Text>
              </View>

              <View>
                <TouchableOpacity
                  style={[styles.inputPrice, styles.extraPadding, Platform.OS === "ios" ? styles.iosInput : styles.androidInput]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <ResponsiveText
                    style={
                      durationMinutes > 0
                        ? styles.filledInput
                        : styles.placeholder
                    }
                    size={14}
                    tabletSize={10}
                  >
                    {durationMinutes > 0
                      ? formatDurationDisplay(durationMinutes)
                      : "Time used on the treatment"}
                  </ResponsiveText>
                </TouchableOpacity>

                {showTimePicker && (
                  <View style={styles.timePickerContainer}>
                    <DateTimePicker
                      value={createDateFromMinutes(durationMinutes)}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      is24Hour={true}
                      onChange={onTimeChange}
                      textColor="black"
                      style={styles.timePicker}
                    />
                    {Platform.OS === "ios" && (
                      <View style={styles.timePickerButtons}>
                        <Pressable
                          onPress={dismissTimePicker}
                          style={styles.timePickerButton}
                        >
                          <Text style={styles.timePickerButtonText}>Done</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.rowContainer}>
                <Text style={styles.text}>Price</Text>

                <Pressable
                  onPress={() => setAlertVisible2(true)}
                  style={styles.iconContainer}
                >
                  <Info
                    size={responsiveScale(20)}
                    color="#687076"
                    style={styles.infoIcon}
                  />
                </Pressable>
                <CustomAlert
                  visible={alertVisible2}
                  title="Price"
                  message="Price will only be visible to you."
                  onClose={() => setAlertVisible2(false)}
                />
              </View>

              <View style={{ alignItems: "flex-start" }}>
                <TextInput
                  style={[
                    styles.inputPrice,
                    Platform.OS === "ios"
                      ? styles.iosInput
                      : styles.androidInput,
                  ]}
                  keyboardType="numeric"
                  multiline={false}
                  placeholderTextColor="rgba(0, 0, 0, 0.5)"
                  placeholder="Price"
                  onChangeText={setPrice}
                  value={price}
                />
              </View>

              <View style={{ alignItems: "flex-start" }}>
                <Text style={styles.text}>Upload images</Text>
              </View>

              <View>
                {capturedMedia.length > 1 ? (
                  <FlatList
                    data={generateMediaList()}
                    keyExtractor={(item, index) => index.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    nestedScrollEnabled={true}
                    renderItem={({ item, index }) => (
                      <Pressable
                        style={styles.camera}
                        onPress={() =>
                          item.type === "video_placeholder"
                            ? pickVideo()
                            : pickImage()
                        }
                      >
                        {item.uri ? (
                          item.type === "image" ? (
                            <>
                              <Image
                                source={{ uri: item.uri }}
                                style={styles.image}
                                resizeMode="cover"
                              />
                              <Pressable
                                onPress={() => removeMedia(index)}
                                style={styles.deleteIconContainer}
                              >
                                <XCircle
                                  size={responsiveScale(28)}
                                  color={Colors.light.light}
                                />
                              </Pressable>
                            </>
                          ) : (
                            <>
                              <Video
                                source={{ uri: item.uri }}
                                style={styles.image}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                isLooping
                              />
                              <XCircle
                                size={responsiveScale(32)}
                                color={Colors.light.light}
                                style={styles.iconBackground}
                              />
                              <Pressable
                                onPress={() => removeMedia(index)}
                                style={styles.deleteIconContainer}
                              >
                                <XCircle
                                  size={responsiveScale(32)}
                                  color={Colors.light.light}
                                />
                              </Pressable>
                            </>
                          )
                        ) : item.type === "video_placeholder" ? (
                          <VideoCamera size={responsiveScale(32)} />
                        ) : (
                          <Camera size={responsiveScale(32)} />
                        )}
                      </Pressable>
                    )}
                  />
                ) : (
                  <View style={styles.cameraButtonRow}>
                    {[0, 1, 2, 3].map((index) => (
                      <Pressable
                        key={index}
                        style={styles.camera}
                        onPress={() => pickImage(index)}
                      >
                        {capturedMedia[index] ? (
                          capturedMedia[index].type === "image" ? (
                            <>
                              <Image
                                source={{ uri: capturedMedia[index].uri }}
                                style={styles.image}
                                resizeMode="cover"
                              />
                              <XCircle
                                size={32}
                                color={Colors.light.light}
                                style={styles.iconBackground}
                              />
                              <Pressable
                                onPress={() => removeMedia(index)}
                                style={styles.deleteIconContainer}
                              >
                                <XCircle
                                  size={responsiveScale(28)}
                                  color={Colors.light.light}
                                />
                              </Pressable>
                            </>
                          ) : (
                            <>
                              <Video
                                source={{ uri: capturedMedia[index].uri }}
                                style={styles.image}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                isLooping
                              />
                              <XCircle
                                size={responsiveScale(32)}
                                color={Colors.light.light}
                                style={styles.iconBackground}
                              />
                              <Pressable
                                onPress={() => removeMedia(index)}
                                style={styles.deleteIconContainer}
                              >
                                <XCircle
                                  size={responsiveScale(28)}
                                  color={Colors.light.light}
                                />
                              </Pressable>
                            </>
                          )
                        ) : (
                          <Camera size={responsiveScale(32)} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.bottomSpacer} />

              <AddButton
                style={styles.addHaircodeButton}
                disabled={isPending || isUploadingMedia}
                text={
                  isPending
                    ? isEditing
                      ? "Updating..."
                      : "Adding haircode..."
                    : isEditing
                    ? "Update haircode"
                    : "Add haircode"
                }
                onPress={handleSubmit}
              />
            </Pressable>
          </ScrollView>

          <DraggableModal
            isVisible={isModalVisible}
            onClose={toggleModal}
            modalHeight={screenHeight * 0.95}
            renderContent={modalContent}
            preview={true}
          />

          <ImageCropModal
            visible={imageToCrop !== null}
            imageUri={imageToCrop || ""}
            onCancel={handleCropCancel}
            onCropComplete={handleCropComplete}
          />
        </SafeAreaView>
      </View>
    </>
  );
};

export default NewHaircode;
const styles = StyleSheet.create({
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
    height: Dimensions.get("window").height * 0.6,  // Match crop and single_haircode height (60% of screen)
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