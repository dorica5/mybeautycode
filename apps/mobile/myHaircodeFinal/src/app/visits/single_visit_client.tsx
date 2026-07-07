import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { DotsThree } from "phosphor-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import {
  MintBrandModalPrimaryButton,
  MintBrandModalSecondaryButton,
} from "@/src/components/MintBrandModal";
import { ModerationSheetHeading } from "@/src/components/moderation/ModerationSheetParts";
import { useI18n } from "@/src/providers/LanguageProvider";
import { VisitRecordScreenHeader } from "@/src/components/visits/VisitRecordScreenHeader";
import {
  useDeleteHaircodeClient,
  useHaircodeWithMedia,
} from "@/src/api/visits";
import { useClientSearch } from "@/src/api/profiles";
import { useAuth } from "@/src/providers/AuthProvider";
import { allBlockerIds } from "@/src/api/moderation";
import {
  moderateScale,
  responsiveMargin,
  responsiveScale,
  scale,
  verticalScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { Image as ExpoImage } from "expo-image";
import {
  VisitRecordDetailView,
  type VisitRecordDetailMedia,
} from "@/src/components/visits/VisitRecordDetailView";
import { VisitClientPersonalNoteSection } from "@/src/components/visits/VisitClientPersonalNoteSection";
import { signVisitMedia } from "@/src/lib/storageSignedUrl";
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

function recordClientPrivateNote(r: ApiRecord | undefined): string | null {
  if (!r) return null;
  const snake = r.client_private_note;
  if (typeof snake === "string") return snake;
  const camel = (r as { clientPrivateNote?: unknown }).clientPrivateNote;
  return typeof camel === "string" ? camel : null;
}

const SingleVisitClient = () => {
  const { t } = useI18n();
  const visitScrollRef = useRef<ScrollView>(null);
  const noteScrollCleanupRef = useRef<(() => void) | null>(null);
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
  const hairdresser_id =
    typeof paramHairdresserId === "string"
      ? paramHairdresserId
      : hairdresserIdFromApi ?? "";

  const { profile } = useAuth();
  const screenHeight = Dimensions.get("window").height;
  const insets = useSafeAreaInsets();
  const carouselHeight = screenHeight * IMAGE_CROP_VIEWPORT_HEIGHT_RATIO;
  const { mutate: deleteHaircode } = useDeleteHaircodeClient();

  const professionCode: ProfessionChoiceCode = professionCodeForVisitRecord(
    record,
    (hairdresserProfile as { profession_codes?: string[] } | null | undefined)
      ?.profession_codes
  );

  const isOwnProfessionalOnVisit = Boolean(
    profile?.id &&
      hairdresser_id &&
      String(profile.id) === String(hairdresser_id)
  );

  const displayClientName =
    profile?.full_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    "Me";
  const clientPhone = profile?.phone_number?.trim() ?? "";
  const phoneLine = clientPhone ? `Tlf: ${clientPhone}` : "";

  /**
   * One scroll after the keyboard has finished opening (`keyboardDidShow`), so we
   * don’t stack multiple animated `scrollToEnd` calls (raf + staggered timeouts).
   */
  const scrollPersonalNoteIntoView = useCallback(() => {
    noteScrollCleanupRef.current?.();
    noteScrollCleanupRef.current = null;

    let finished = false;

    const scrollOnce = () => {
      if (finished) return;
      finished = true;
      subscription.remove();
      clearTimeout(fallbackId);
      noteScrollCleanupRef.current = null;
      requestAnimationFrame(() => {
        visitScrollRef.current?.scrollToEnd({ animated: true });
      });
    };

    const subscription = Keyboard.addListener("keyboardDidShow", scrollOnce);
    const fallbackId = setTimeout(scrollOnce, Platform.OS === "ios" ? 400 : 280);
    noteScrollCleanupRef.current = () => {
      subscription.remove();
      clearTimeout(fallbackId);
      noteScrollCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      noteScrollCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = (record?.media ?? []) as Parameters<
        typeof signVisitMedia
      >[0];
      const out = await signVisitMedia(raw);
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
          const blockerIds = await allBlockerIds(profile.id, professionCode);
          setIsBlockedByHairdresser(blockerIds.includes(hairdresser_id));
        } catch (error) {
          console.error("Error checking block status:", error);
          setIsBlockedByHairdresser(false);
        }
      }
    };

    checkBlockStatus();
  }, [profile?.id, hairdresser_id, professionCode]);

  const handleDelete = (id: string, hId: string) => {
    deleteHaircode({ haircodeId: id, hairdresserId: hId });
  };

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  const handleHairdresserPress = () => {
    if (isOwnProfessionalOnVisit || isBlockedByHairdresser || !hairdresser_id) {
      return;
    }
    router.push({
      pathname: "./other_professional_profile",
      params: {
        hairdresser_id: String(hairdresser_id),
        profession_code: professionCode,
      },
    });
  };

  const modalContent = (
    <View style={styles.sheetFooter}>
      <ModerationSheetHeading
        title={t("visits.deleteVisitTitle")}
        subtitle={t("visits.deleteVisitSubtitle")}
      />
      <MintBrandModalPrimaryButton
        label={t("common.delete")}
        accessibilityLabel={t("visits.deleteVisitA11y")}
        onPress={() =>
          handleDelete(haircodeId ?? "", (hairdresser_id || profile?.id) ?? "")
        }
      />
      <MintBrandModalSecondaryButton
        label={t("common.cancel")}
        onPress={toggleModal}
      />
    </View>
  );

  if (!haircodeId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t("visits.missingVisitId")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t("visits.visitNotFoundShort")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={
            Platform.OS === "ios" ? 0 : responsiveScale(20)
          }
        >
          <ScrollView
            ref={visitScrollRef}
            style={styles.scroll}
            contentContainerStyle={{
              paddingBottom:
                verticalScale(28) +
                Math.max(insets.bottom, verticalScale(8)),
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
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
                  accessibilityLabel={t("visits.visitActions")}
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
                isOwnProfessionalOnVisit || isBlockedByHairdresser
                  ? undefined
                  : handleHairdresserPress
              }
              professionalDisabled={
                isOwnProfessionalOnVisit || isBlockedByHairdresser
              }
            />

            <VisitClientPersonalNoteSection
              haircodeId={haircodeId}
              remoteNote={recordClientPrivateNote(record)}
              onPersonalNoteFocus={scrollPersonalNoteIntoView}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        <SmallDraggableModal
          isVisible={isModalVisible}
          onClose={toggleModal}
          modalHeight={"68%"}
          sheetVariant="brand"
          renderContent={modalContent}
          done={false}
        />
      </SafeAreaView>
    </>
  );
};

export default SingleVisitClient;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  keyboardAvoiding: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scroll: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  menuBtn: {
    padding: scale(4),
  },
  sheetFooter: {
    width: "100%",
    alignSelf: "stretch",
    alignItems: "center",
    gap: responsiveMargin(14),
    paddingTop: responsiveMargin(8),
    paddingHorizontal: moderateScale(4),
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
});
