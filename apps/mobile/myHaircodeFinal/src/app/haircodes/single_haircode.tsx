import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DotsThree,
  PencilSimple,
  Trash,
  UserCircle,
} from "phosphor-react-native";
import { Colors } from "@/src/constants/Colors";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import ProfileModal from "@/src/components/ProfileModal";
import Carousel from "react-native-reanimated-carousel";
import Dots from "react-native-dots-pagination";
import TopNavGallery from "@/src/components/TopNavGallery";
import { router, useLocalSearchParams } from "expo-router";
import {
  useDeleteHaircodeHairdresser,
  useHaircodeWithMedia,
} from "@/src/api/haircodes";
import { ResizeMode } from "expo-av";
import { Image } from "expo-image";
import OptimizedImage from "@/src/components/OptimizedImage";
import RemoteVideo from "@/src/components/RemoteVideo";
import { getImageTransformUrl } from "@/src/utils/supabaseHelpers";
import {
  useSharedValue,
  useAnimatedReaction,
  runOnJS,
} from "react-native-reanimated";
import CustomAlert from "@/src/components/CustomAlert";
import NoImageHaircode from "@/src/components/no_image_haircode";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/providers/AuthProvider";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { formatDurationFromMinutes } from "@/src/utils/formatDurationFromFakeDate";
import {
  responsiveScale,
  scalePercent,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
  responsiveBorderRadius,
  screenWidth,
  isTablet,
} from "@/src/utils/responsive";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";

const SingleHaircode = () => {
  const {
    haircodeId,
    hairdresserName,
    description,
    services,
    createdAt,
    full_name,
    number,
    salon_name,
    hairdresser_profile_pic,
    salonPhoneNumber,
    about_me,
    booking_site,
    social_media,
    price,
    duration,
    relationship,
  } = useLocalSearchParams();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);

  const { data: haircodeWithMedia, isLoading } =
    useHaircodeWithMedia(haircodeId);

  const media = haircodeWithMedia?.media || [];

  const carouselWidth = screenWidth(); // 100% of screen width
  const screenHeight = Dimensions.get("window").height;
  const carouselHeight = screenHeight * 0.6; // Fixed 60% of screen height
  const [currentIndex, setCurrentIndex] = useState(0);
  const sharedCurrentIndex = useSharedValue(0);
  const [alertVisible, setAlertVisible] = useState(false);

  const servicesArray =
    typeof services === "string" ? services.split(", ") : services || [];

  const { mutate: deleteHaircode } = useDeleteHaircodeHairdresser();
  const { profile } = useAuth();
  const [showEditOptions, setShowEditOptions] = useState(true);

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
    setIsDeleteConfirmVisible(false);
    setShowEditOptions(true);
  };

  const [serviceImages] = useState(() => {
    const icons = [];
    if (servicesArray.includes("Haircut")) icons.push("Scissors");
    if (servicesArray.includes("Color service")) icons.push("PaintBrush");
    return icons;
  });

  const editHaircode = async () => {
    try {
      const haircode = haircodeWithMedia;
      if (!haircode?.createdAt) {
        Alert.alert("Error", "Haircode not found.");
        return;
      }

      const createdAtDate = new Date(haircode.createdAt);
      const now = new Date();
      const daysDiff = (now - createdAtDate) / (1000 * 60 * 60 * 24);

      if (daysDiff > 7) {
        console.log("Haircode is older than 7 days. Showing message.");
        setShowEditOptions(false);
        return;
      }

      router.replace({
        pathname: "/haircodes/new_haircode",
        params: {
          haircodeId,
          services: haircode.services,
          description: haircode.serviceDescription,
          price: haircode.price,
          duration: haircode.duration,
          media: JSON.stringify(media),
          clientId: haircode.clientId,
          hairdresserName: hairdresserName,
          full_name: full_name,
          number: number,
          salon_name: salon_name,
          hairdresser_profile_pic: hairdresser_profile_pic,
        },
      });
    } catch (error) {
      console.error("Error editing haircode:", error);
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const haircode = haircodeWithMedia;
      if (!haircode?.createdAt) {
        Alert.alert("Error", "Haircode not found.");
        return;
      }

      const createdAtDate = new Date(haircode.createdAt);
      const now = new Date();
      const daysDiff = (now - createdAtDate) / (1000 * 60 * 60 * 24);

      if (daysDiff > 7) {
        console.log("Haircode is older than 7 days. Cannot delete.");
        setShowEditOptions(false);
        return;
      }

      setIsDeleteConfirmVisible(true);
    } catch (error) {
      console.error("Error checking haircode age:", error);
      Alert.alert("Error", "Could not verify deletion eligibility.");
    }
  };

  const handleDelete = (haircodeId, hairdresserId) => {
    console.log("Haircode ID is: ", haircodeId);
    console.log("Hairdresser ID is: ", hairdresserId);
    deleteHaircode({ haircodeId, hairdresserId });
  };

  useAnimatedReaction(
    () => sharedCurrentIndex.value,
    (value) => {
      runOnJS(setCurrentIndex)(value);
    }
  );

  const modalContent = isDeleteConfirmVisible ? (
    <View style={styles.confirmationContainer}>
      <Text style={styles.confirmationText}>
        Are you sure you want to delete this haircode?
      </Text>
      <Pressable
        onPress={() => handleDelete(haircodeId, profile.id)}
        style={styles.deleteButton}
      >
        <Text style={styles.myButtonText}>Delete</Text>
      </Pressable>
      <Pressable onPress={toggleModal} style={styles.cancelButton}>
        <Text style={styles.myButtonText}>Cancel</Text>
      </Pressable>
    </View>
  ) : showEditOptions ? (
    <View style={{ marginTop: responsiveMargin(20) }}>
      <ProfileModal
        title="Edit"
        Icon={PencilSimple}
        top={true}
        onPress={editHaircode}
      />
      <ProfileModal
        title="Delete"
        Icon={Trash}
        bottom={true}
        onPress={handleDeleteConfirm}
      />
    </View>
  ) : (
    <View style={styles.sorryContainer}>
      <Text style={styles.sorryText}>Sorry!</Text>
      <Text style={styles.messageText}>
        You can only edit or delete haircodes within 7 days of creation.
      </Text>
      <Pressable onPress={toggleModal} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>Close</Text>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNavGallery
          title={Array.isArray(full_name) ? full_name.join(", ") : full_name}
          secondTitle={Array.isArray(number) ? number.join(", ") : number}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.warmGreen} />
          <Text style={styles.loadingText}>Loading haircode...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomAlert
        visible={alertVisible}
        title="Sorry!"
        message="Haircode can only be edited within 7 days of creation."
        onClose={() => setAlertVisible(false)}
      />
      <ScrollView>
        <TopNavGallery
          title={Array.isArray(full_name) ? full_name.join(", ") : full_name}
          secondTitle={Array.isArray(number) ? number.join(", ") : number}
        />
        <View style={styles.serviceDetails}>
          <Text style={styles.serviceText}>{services}</Text>
          <View style={styles.dateContainer}>
            <Text style={styles.serviceDate}>{createdAt}</Text>

            {hairdresserName === profile.full_name && (
              <Pressable onPress={toggleModal} style={styles.popupContainer}>
                <DotsThree size={responsiveScale(32)} style={styles.icon} />
              </Pressable>
            )}
          </View>
        </View>

        <Carousel
          loop
          width={carouselWidth}
          height={carouselHeight}
          autoPlay={false}
          data={media && media.length > 0 ? media : servicesArray}
          onSnapToItem={(index) => {
            sharedCurrentIndex.value = index;

            // Prefetch adjacent images for smoother carousel navigation
            const mediaArray = media && media.length > 0 ? media : servicesArray;
            const prefetchImage = (idx: number) => {
              if (idx >= 0 && idx < mediaArray.length) {
                const item = mediaArray[idx];
                const url = item?.mediaUrl ?? item?.media_url;
                if ((item?.mediaType ?? item?.media_type) === "image" && url) {
                  const previewUrl = getImageTransformUrl("haircode_images", url, 1600);
                  Image.prefetch(previewUrl);
                }
              }
            };

            // Prefetch next and previous images
            prefetchImage(index + 1);
            prefetchImage(index - 1);
          }}
          scrollAnimationDuration={100}
          renderItem={({ item, index }) => {
            if (!media || media.length === 0) {
              const service = servicesArray[index] || "HairDryer";
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

            const mediaUrl = item?.mediaUrl ?? item?.media_url;
            const mediaType = item?.mediaType ?? item?.media_type;
            return mediaType === "image" ? (
                <OptimizedImage
                  path={mediaUrl}
                  bucket="haircode_images"
                  sizePreset="original"
                  style={styles.modalImage}
                  contentFit="cover"
                />
              ) : (
                <RemoteVideo
                  path={mediaUrl}
                  storage="haircode_images"
                  style={styles.modalImage}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                isLooping
              />
            );
          }}
          style={styles.carouselContainer}
        />
        <View style={{ marginTop: responsiveScale(10) }}>
          <Dots
            length={
              media && media.length > 0 ? media.length : servicesArray.length
            }
            active={currentIndex}
            activeDotWidth={10}
            passiveDotWidth={8}
            activeColor={Colors.dark.warmGreen}
            passiveColor={"rgba(0,0,0,0.2)"}
          />
        </View>

        <View style={styles.hairdresserDetails}>
          <Pressable
            style={styles.hairdresserRow}
            onPress={() =>
              router.push({
                pathname: "./other_hairdresser_profile",
                params: {
                  hairdresserName: hairdresserName,
                  salon_name: salon_name,
                  hairdresser_profile_pic: hairdresser_profile_pic,
                  salonPhoneNumber,
                  about_me,
                  booking_site,
                  social_media,
                },
              })
            }
          >
            {hairdresser_profile_pic ? (
              <AvatarWithSpinner 
                uri={hairdresser_profile_pic} 
                size={responsiveScale(50)} 
                style={styles.profile_image} 
              />
            ) : (
              <View style={styles.defaultImage}>
                <UserCircle
                  size={responsiveScale(32)}
                  color={Colors.dark.dark}
                  weight="regular"
                />
              </View>
            )}
            <Text style={styles.hairdresserName}>
              {hairdresserName}, {salon_name}
            </Text>
          </Pressable>
          <ResponsiveText size={16} tabletSize={14} style={styles.priceText}>
            Duration: {duration ? formatDurationFromMinutes(parseInt(duration)) : ""}
          </ResponsiveText>
          {hairdresserName === profile.full_name && (
            <ResponsiveText size={16} tabletSize={14} style={styles.priceText}>Price: {price} </ResponsiveText>
          )}

          <Text style={styles.haircodeText}>{description}</Text>
        </View>

        <SmallDraggableModal
          isVisible={isModalVisible}
          onClose={toggleModal}
          modalHeight={"50%"}
          renderContent={modalContent}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SingleHaircode;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: responsiveScale(50),
  },
  loadingText: {
    fontFamily: "Inter-SemiBold",
    fontSize: responsiveFontSize(16, 14),
    color: Colors.dark.warmGreen,
  },
  serviceDetails: {
    margin: scalePercent(5),
  },
  serviceText: {
    fontSize: responsiveFontSize(14, 12),
    color: Colors.dark.dark,
    fontFamily: "Inter-SemiBold",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: responsiveScale(10),
  },
  serviceDate: {
    fontSize: responsiveFontSize(14, 12),
    color: Colors.dark.dark,
    fontFamily: "Inter-SemiBold",
  },
  icon: {
    marginTop: responsiveScale(8),
    marginRight: 0,
  },
  carouselContainer: {
    marginVertical: responsiveScale(12),
    alignSelf: "center",
  },
  modalImage: {
    width: scalePercent(100),
    height: "100%",
  },
  hairdresserDetails: {
    marginLeft: scalePercent(5),
    marginTop: responsiveScale(20),
  },
  hairdresserName: {
    flex: 1,
    fontSize: responsiveFontSize(16, 14),
    color: Colors.dark.dark,
    fontFamily: "Inter-SemiBold",
    marginLeft: responsiveScale(10),
  },
  haircodeText: {
    marginTop: responsiveScale(20),
    marginBottom: responsiveScale(20),
    fontSize: responsiveFontSize(16, 14),
    color: Colors.dark.dark,
    fontFamily: "Inter-Regular",
  },
  priceText: {
    color: Colors.dark.dark,
    fontFamily: "Inter-SemiBold",
    marginTop: responsiveScale(8),
  },
  popupContainer: {
    position: "absolute",
    right: 0,
  },
  confirmationContainer: {
    paddingHorizontal: responsivePadding(20),
    alignItems: "center",
  },
  confirmationText: {
    fontSize: responsiveFontSize(16, 14),
    color: Colors.dark.dark,
    fontFamily: "Inter-SemiBold",
    textAlign: "center",
    marginTop: responsiveScale(20),
  },
  noMediaContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  deleteButton: {
    backgroundColor: Colors.dark.warmGreen,
    marginTop: responsiveScale(40),
    padding: responsivePadding(15),
    borderRadius: responsiveBorderRadius(40),
    width: scalePercent(90),
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: Colors.dark.yellowish,
    borderColor: Colors.dark.warmGreen,
    borderWidth: responsiveScale(2),
    marginTop: responsiveScale(32),
    padding: responsivePadding(15),
    borderRadius: responsiveBorderRadius(40),
    width: scalePercent(90),
    alignItems: "center",
  },
  myButtonText: {
    color: Colors.dark.dark,
    fontSize: responsiveFontSize(16, 14),
    fontFamily: "Inter-SemiBold",
  },
  noMediaText: {
    fontSize: responsiveFontSize(16, 14),
    color: Colors.dark.yellowish,
  },
  profile_image: {
    width: responsiveScale(50),
    height: responsiveScale(50),
    borderRadius: responsiveScale(25),
  },
  hairdresserRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: responsiveScale(10),
  },
  sorryContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: responsivePadding(20),
  },
  sorryText: {
    fontSize: responsiveFontSize(20, 18),
    fontFamily: "Inter-Bold",
    color: Colors.dark.dark,
    textAlign: "center",
    marginBottom: responsiveScale(30),
  },
  messageText: {
    fontSize: responsiveFontSize(16, 14),
    fontFamily: "Inter-SemiBold",
    color: Colors.dark.dark,
    textAlign: "center",
    marginBottom: responsiveScale(30),
  },
  closeButton: {
    backgroundColor: Colors.light.yellowish,
    paddingVertical: responsivePadding(10),
    paddingHorizontal: responsivePadding(20),
    borderRadius: responsiveBorderRadius(10),
    borderColor: Colors.dark.dark,
    borderWidth: responsiveScale(1),
  },
  closeButtonText: {
    color: Colors.dark.dark,
    fontFamily: "Inter-SemiBold",
    fontSize: responsiveFontSize(14, 12),
  },
  defaultImage: {
    width: responsiveScale(50),
    height: responsiveScale(50),
    borderRadius: responsiveScale(25),
    backgroundColor: Colors.dark.warmGreen,
    justifyContent: "center",
    alignItems: "center",
  },
});