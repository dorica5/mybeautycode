import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, Dimensions, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DotsThree, Trash } from "phosphor-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import { VisitRecordScreenHeader } from "@/src/components/visits/VisitRecordScreenHeader";
import MyButton from "@/src/components/MyButton";
import {
  useDeleteHaircodeClient,
  useHaircodeWithMedia,
} from "@/src/api/haircodes";
import { useClientSearch } from "@/src/api/profiles";
import { useAuth } from "@/src/providers/AuthProvider";
import { allBlockerIds } from "@/src/api/moderation";
import {
  moderateScale,
  responsiveMargin,
  responsiveScale,
  scale,
  scalePercent,
  verticalScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { Image as ExpoImage } from "expo-image";
import {
  VisitRecordDetailView,
  type VisitRecordDetailMedia,
} from "@/src/components/visits/VisitRecordDetailView";
import { signHaircodeVisitMedia } from "@/src/lib/storageSignedUrl";
import {
  professionCodeForVisitRecord,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { IMAGE_CROP_VIEWPORT_HEIGHT_RATIO } from "@/src/components/ImageCropModal";

type ApiRecord = Record<string, unknown> & {
  media?: unknown[];
  profession?: { code?: string };
  professionalProfile?: {
    professionalProfessions?: { profession?: { code?: string } }[];
  };
};

function recordServices(r: ApiRecord | undefined, fallback: string): string {
  if (!r) return fallback;
  const rd = r.recordData as { services?: string } | undefined;
  if (rd?.services) return rd.services;
  const legacy = r.record_data as { services?: string } | undefined;
  if (legacy?.services) return legacy.services;
  return fallback;
}

function recordSummary(r: ApiRecord | undefined, fallback: string): string {
  if (!r) return fallback;
  const s = r.summary ?? r.serviceName ?? r.service_name;
  return s != null ? String(s) : fallback;
}

const SingleHaircodeClient = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBlockedByHairdresser, setIsBlockedByHairdresser] = useState(false);
  const [signedMedia, setSignedMedia] = useState<VisitRecordDetailMedia[]>([]);
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
    hairdresser_id: paramHairdresserId,
  } = useLocalSearchParams();

  const haircodeId =
    typeof paramHaircodeId === "string" ? paramHaircodeId : undefined;

  const { data: haircodeWithMedia, isLoading, isError } =
    useHaircodeWithMedia(haircodeId ?? "");
  const record = haircodeWithMedia as ApiRecord | undefined;

  const hairdresserIdFromApi = haircodeWithMedia?.hairdresserId as
    | string
    | undefined;
  const effectiveHairdresserId = paramHairdresserId ?? hairdresserIdFromApi;
  const { data: hairdresserProfile } = useClientSearch(
    typeof effectiveHairdresserId === "string" ? effectiveHairdresserId : ""
  );

  const hairdresserName =
    paramHairdresserName ?? haircodeWithMedia?.hairdresserName ?? "";
  const paramServicesStr =
    typeof paramServices === "string"
      ? paramServices
      : Array.isArray(paramServices)
      ? paramServices.join(", ")
      : "";
  const services = recordServices(record, paramServicesStr);
  const descriptionText = recordSummary(record, "");
  const createdAt = paramCreatedAt
    ? typeof paramCreatedAt === "string"
      ? paramCreatedAt
      : Array.isArray(paramCreatedAt)
      ? paramCreatedAt[0]
      : ""
    : record?.createdAt || record?.created_at
    ? new Date(
        String(record.createdAt ?? record.created_at)
      ).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const salon_name =
    typeof paramSalonName === "string"
      ? paramSalonName
      : hairdresserProfile?.salonName ?? "";
  const hairdresser_profile_pic =
    typeof paramHairdresserProfilePic === "string"
      ? paramHairdresserProfilePic
      : hairdresserProfile?.avatarUrl ?? "";
  const salonPhoneNumber =
    typeof paramSalonPhoneNumber === "string"
      ? paramSalonPhoneNumber
      : hairdresserProfile?.salonPhoneNumber ?? "";
  const about_me =
    typeof paramAboutMe === "string"
      ? paramAboutMe
      : hairdresserProfile?.aboutMe ?? "";
  const booking_site =
    typeof paramBookingSite === "string"
      ? paramBookingSite
      : hairdresserProfile?.bookingSite ?? "";
  const social_media =
    typeof paramSocialMedia === "string"
      ? paramSocialMedia
      : typeof hairdresserProfile?.socialMedia === "string"
      ? hairdresserProfile.socialMedia
      : JSON.stringify(hairdresserProfile?.socialMedia ?? {});
  const hairdresser_id =
    typeof paramHairdresserId === "string"
      ? paramHairdresserId
      : hairdresserIdFromApi ?? "";

  const { profile } = useAuth();
  const screenHeight = Dimensions.get("window").height;
  const carouselHeight = screenHeight * IMAGE_CROP_VIEWPORT_HEIGHT_RATIO;
  const { mutate: deleteHaircode } = useDeleteHaircodeClient();

  const professionCode: ProfessionChoiceCode = professionCodeForVisitRecord(
    record,
    (hairdresserProfile as { profession_codes?: string[] } | null | undefined)
      ?.profession_codes
  );

  const displayClientName =
    profile?.full_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    "Me";
  const clientPhone = profile?.phone_number?.trim() ?? "";
  const phoneLine = clientPhone ? `Tlf: ${clientPhone}` : "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = (record?.media ?? []) as Parameters<
        typeof signHaircodeVisitMedia
      >[0];
      const out = await signHaircodeVisitMedia(raw);
      const imageUrls = out
        .filter((s) => s.uri && s.type !== "video")
        .map((s) => s.uri);
      if (imageUrls.length > 0) {
        void ExpoImage.prefetch(imageUrls, { cachePolicy: "memory-disk" });
      }
      if (!cancelled) setSignedMedia(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [haircodeWithMedia, haircodeId, record?.media]);

  useEffect(() => {
    const checkBlockStatus = async () => {
      if (profile?.id && hairdresser_id) {
        try {
          const blockerIds = await allBlockerIds(profile.id);
          setIsBlockedByHairdresser(blockerIds.includes(hairdresser_id));
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
  };

  const modalContent = (
    <>
      <MyButton
        Icon={Trash}
        text="Delete Haircode"
        onPress={() =>
          handleDelete(haircodeId ?? "", (hairdresser_id || profile?.id) ?? "")
        }
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
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Missing haircode ID</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Haircode not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <VisitRecordScreenHeader
            title={displayClientName}
            subtitle={phoneLine || undefined}
            rightSlot={
              <Pressable
                onPress={toggleModal}
                style={styles.menuBtn}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Visit actions"
              >
                <DotsThree size={32} color={primaryBlack} />
              </Pressable>
            }
          />

          <VisitRecordDetailView
            dateText={createdAt}
            serviceText={services}
            commentText={descriptionText}
            showDurationRow={false}
            showPriceRow={false}
            durationText=""
            priceText=""
            professionCode={professionCode}
            professional={{
              full_name: hairdresserName,
              salon_name: salon_name?.trim() ? salon_name : undefined,
              avatar_url: hairdresser_profile_pic || undefined,
            }}
            mediaSlides={signedMedia}
            carouselHeight={carouselHeight}
            onPressProfessional={
              isBlockedByHairdresser ? undefined : handleHairdresserPress
            }
            professionalDisabled={isBlockedByHairdresser}
          />
        </ScrollView>

        <SmallDraggableModal
          isVisible={isModalVisible}
          onClose={toggleModal}
          modalHeight={"40%"}
          renderContent={modalContent}
          done={false}
        />
      </SafeAreaView>
    </>
  );
};

export default SingleHaircodeClient;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scroll: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(24),
  },
  menuBtn: {
    padding: scale(4),
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
    color: primaryBlack,
  },
  deleteButton: {
    width: scalePercent(90),
    marginTop: scalePercent(2),
    alignSelf: "center",
    backgroundColor: primaryBlack,
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
  cancelButton: {
    borderWidth: scale(2),
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
    width: scalePercent(90),
    marginTop: scalePercent(3),
    alignSelf: "center",
  },
});
