import React, { useState, useEffect, useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DotsThree, Trash } from "phosphor-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/src/constants/Colors";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import Carousel from "react-native-reanimated-carousel";
import Dots from "react-native-dots-pagination";
import TopNav from "@/src/components/TopNav";
import MyButton from "@/src/components/MyButton";
import {
  useDeleteHaircodeClient,
  useHaircodeWithMedia,
} from "@/src/api/haircodes";
import { useClientSearch } from "@/src/api/profiles";
import { ResizeMode } from "expo-av";
import { Image } from "expo-image";
import OptimizedImage from "@/src/components/OptimizedImage";
import RemoteVideo from "@/src/components/RemoteVideo";
import { fetchSignedStorageUrl } from "@/src/lib/storageSignedUrl";
import { useAuth } from "@/src/providers/AuthProvider";
import NoImageHaircode from "@/src/components/no_image_haircode";
import {
  useSharedValue,
  useAnimatedReaction,
  runOnJS,
} from "react-native-reanimated";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { formatDurationFromMinutes } from "@/src/utils/formatDurationFromFakeDate";
import { allBlockerIds } from "@/src/api/moderation";
import {
  isTablet,
  moderateScale,
  responsiveMargin,
  responsiveScale,
  scale,
  scalePercent,
  verticalScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";

const SingleHaircodeClient = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBlockedByHairdresser, setIsBlockedByHairdresser] = useState(false);
  const {
    haircodeId: paramHaircodeId,
    hairdresserName: paramHairdresserName,
    services: paramServices,
    createdAt: paramCreatedAt,
    salon_name: paramSalonName,
    hairdresser_profile_pic: paramHairdresserProfilePic,
    salonPhoneNumber: paramSalonPhoneNumber,
    about_me: paramAboutMe,
    booking_site: paramBookingSite,
    social_media: paramSocialMedia,
    duration: paramDuration,
    hairdresser_id: paramHairdresserId,
  } = useLocalSearchParams();

  const haircodeId = typeof paramHaircodeId === "string" ? paramHaircodeId : undefined;

  const { data: haircodeWithMedia, isLoading, isError } =
    useHaircodeWithMedia(haircodeId ?? "");

  const hairdresserIdFromApi = haircodeWithMedia?.hairdresserId as string | undefined;
  const effectiveHairdresserId = paramHairdresserId ?? hairdresserIdFromApi;
  const { data: hairdresserProfile } = useClientSearch(effectiveHairdresserId ?? "");

  const hairdresserName = paramHairdresserName ?? haircodeWithMedia?.hairdresserName ?? "";
  const services = paramServices ?? haircodeWithMedia?.services ?? "";
  const createdAt = paramCreatedAt ?? (haircodeWithMedia?.createdAt ? new Date(haircodeWithMedia.createdAt as string).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "");
  const salon_name = paramSalonName ?? hairdresserProfile?.salonName ?? "";
  const hairdresser_profile_pic = paramHairdresserProfilePic ?? hairdresserProfile?.avatarUrl ?? "";
  const salonPhoneNumber = paramSalonPhoneNumber ?? hairdresserProfile?.salonPhoneNumber ?? "";
  const about_me = paramAboutMe ?? hairdresserProfile?.aboutMe ?? "";
  const booking_site = paramBookingSite ?? hairdresserProfile?.bookingSite ?? "";
  const social_media = paramSocialMedia ?? (typeof hairdresserProfile?.socialMedia === "string" ? hairdresserProfile.socialMedia : JSON.stringify(hairdresserProfile?.socialMedia ?? {}));
  const duration = paramDuration ?? haircodeWithMedia?.duration ?? "";
  const hairdresser_id = paramHairdresserId ?? hairdresserIdFromApi ?? "";

  const { profile } = useAuth();
  const carouselWidth = Dimensions.get("window").width; // 100% of screen width
  const screenHeight = Dimensions.get("window").height;
  const carouselHeight = screenHeight * 0.6; // Fixed 60% of screen height
  const { mutate: deleteHaircode } = useDeleteHaircodeClient();

  const media = haircodeWithMedia?.media || [];

  // Check if current user is blocked by the hairdresser
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (profile?.id && hairdresser_id) {
        try {
          const blockerIds = await allBlockerIds(profile.id);
          const isBlocked = blockerIds.includes(hairdresser_id);
          setIsBlockedByHairdresser(isBlocked);
        } catch (error) {
          console.error("Error checking block status:", error);
          setIsBlockedByHairdresser(false);
        }
      }
    };

    checkBlockStatus();
  }, [profile?.id, hairdresser_id]);

  const handleDelete = (id: string, hId: string) => {
    deleteHaircode({ haircodeId: id, hairdresserId: hId });
  };

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  const handleHairdresserPress = () => {
    // Only navigate if not blocked by the hairdresser
    if (!isBlockedByHairdresser) {
      router.push({
        pathname: "./other_professional_profile",
        params: {
          hairdresserName: hairdresserName,
          salon_name: salon_name,
          hairdresser_profile_pic: hairdresser_profile_pic,
          salonPhoneNumber,
          about_me,
          booking_site,
          social_media,
          hairdresser_id,
        },
      });
    }
    // If blocked, do nothing (no navigation, no alert)
  };

  const sharedCurrentIndex = useSharedValue(0);

  const servicesArray = useMemo(
    () => (typeof services === "string" ? services.split(", ") : Array.isArray(services) ? services : []),
    [services]
  );

  const serviceImages = useMemo(() => {
    const icons = [];
    if (servicesArray.includes("Haircut")) icons.push("Scissors");
    if (servicesArray.includes("Color service")) icons.push("PaintBrush");
    return icons;
  }, [servicesArray]);

  useAnimatedReaction(
    () => sharedCurrentIndex.value,
    (value) => {
      runOnJS(setCurrentIndex)(value);
    }
  );

  const modalContent = (
    <>
      <MyButton
        Icon={Trash}
        text="Delete Haircode"
        onPress={() => handleDelete(haircodeId, (hairdresser_id || profile?.id) ?? "")}
        style={styles.deleteButton}
        iconStyle={{ left: scale(-30) }}
      />
      <MyButton
        text="Cancel"
        onPress={toggleModal}
        style={styles.cancelButton}
      />
    </>
  );

  if (!haircodeId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Missing haircode ID</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Haircode not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />

      <SafeAreaView style={styles.container}>
        <ScrollView>
          <View style={{ margin: "0%" }}>
            <TopNav title="" />
          </View>
          <View style={styles.serviceDetails}>
            <Text style={styles.serviceText}>{services}</Text>
            <View style={styles.dateContainer}>
              <Text style={styles.serviceDate}>{createdAt}</Text>
              <Pressable onPress={toggleModal} style={styles.popupContainer}>
                <DotsThree size={32} style={styles.dotsicon} />
              </Pressable>
            </View>
          </View>

          <Carousel
            loop
            width={carouselWidth}
            height={carouselHeight}
            autoPlay={false}
            data={media.length > 0 ? media : servicesArray}
            onSnapToItem={(index) => {
              sharedCurrentIndex.value = index;

              // Prefetch adjacent images for smoother carousel navigation
              const mediaArray = media.length > 0 ? media : servicesArray;
              const prefetchImage = (idx: number) => {
                if (idx >= 0 && idx < mediaArray.length) {
                  const item = mediaArray[idx];
                  const url = item?.mediaUrl ?? item?.media_url;
                  if ((item?.mediaType ?? item?.media_type) === "image" && url) {
                    void (async () => {
                      const previewUrl = url.startsWith("http")
                        ? url
                        : (await fetchSignedStorageUrl("haircode_images", url)) ??
                          null;
                      if (previewUrl) Image.prefetch(previewUrl);
                    })();
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

          <Pressable
            style={[
              styles.hairdresserRow,
              isBlockedByHairdresser && styles.blockedRow,
            ]}
            onPress={handleHairdresserPress}
            disabled={isBlockedByHairdresser}
          >
            <AvatarWithSpinner
              uri={hairdresser_profile_pic}
              size={scale(50)}
              style={[
                styles.profile_image,
                !hairdresser_profile_pic && styles.defaultImage,
                isBlockedByHairdresser && styles.blockedImage,
              ]}
            />
            <Text
              style={[
                styles.hairdresserName,
                isBlockedByHairdresser && styles.blockedText,
              ]}
            >
              {hairdresserName}, {salon_name}
            </Text>
          </Pressable>
          <ResponsiveText style={styles.priceText}>
            Duration:{" "}
            {duration ? formatDurationFromMinutes(parseInt(duration)) : ""}
          </ResponsiveText>

          <SmallDraggableModal
            isVisible={isModalVisible}
            onClose={toggleModal}
            modalHeight={"40%"}
            renderContent={modalContent}
            done={false}
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default SingleHaircodeClient;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: verticalScale(50),
  },
  loadingText: {
    fontFamily: "Inter-SemiBold",
    fontSize: moderateScale(16),
    color: Colors.dark.warmGreen,
  },
  serviceDetails: {
    margin: scalePercent(5),
  },
  serviceText: {
    fontSize: moderateScale(14),
    color: Colors.dark.dark,
    fontFamily: "Inter-SemiBold",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(10),
  },
  serviceDate: {
    fontSize: moderateScale(14),
    color: Colors.dark.dark,
    fontFamily: "Inter-SemiBold",
  },
  dotsicon: {
    marginTop: scalePercent(2),
    marginRight: scalePercent(0),
  },
  hairImage: {
    width: scalePercent(100),
    height: verticalScale(400),
  },
  hairdresserDetails: {
    marginLeft: "5%",
    marginTop: scale(10),
  },
  carouselContainer: {
    alignSelf: "center",
  },
  modalImage: {
    width: scalePercent(100),
    height: "100%",
  },
  hairdresserName: {
    flex: 1,
    fontSize: moderateScale(16),
    color: Colors.dark.dark,
    fontFamily: "Inter-SemiBold",
    marginLeft: scale(10),
  },
  hairdresserRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: scalePercent(5),
    marginLeft: scalePercent(5),
  },
  profile_image: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
  },
  haircodeText: {
    marginTop: verticalScale(20),
    fontSize: moderateScale(16),
    color: Colors.dark.dark,
    fontFamily: "Inter",
  },
  popupContainer: {
    position: "absolute",
    right: 0,
  },
  cancelButton: {
    borderWidth: scale(2),
    borderColor: Colors.light.warmGreen,
    backgroundColor: Colors.dark.yellowish,
    width: scalePercent(90),
    marginTop: scalePercent(3),
    alignSelf: "center",
  },
  noMediaText: {},
  deleteButton: {
    width: scalePercent(90),
    marginTop: scalePercent(2),
    alignSelf: "center",
    backgroundColor: Colors.dark.warmGreen,
    shadowOffset: {
      width: 0,
      height: scale(2),
    },
    shadowOpacity: 0.6,
    shadowRadius: scale(4),
    elevation: 10,
    padding: scale(15),
    borderRadius: scale(81),
    alignItems: "center",
  },
  noMediaContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  defaultImage: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: Colors.dark.warmGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  priceText: {
    fontSize: moderateScale(16),
    color: Colors.dark.dark,
    fontFamily: "Inter-SemiBold",
    marginTop: scalePercent(1),
    marginLeft: scalePercent(4),
  },
});
