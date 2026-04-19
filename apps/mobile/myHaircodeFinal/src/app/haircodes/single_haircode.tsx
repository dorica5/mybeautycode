import React, { useCallback, useEffect, useState } from "react";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DotsThree,
  PencilSimple,
  Trash,
} from "phosphor-react-native";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import SmallDraggableModal from "@/src/components/SmallDraggableModal";
import ProfileModal from "@/src/components/ProfileModal";
import { VisitRecordScreenHeader } from "@/src/components/visits/VisitRecordScreenHeader";
import { router, useLocalSearchParams } from "expo-router";
import {
  useDeleteHaircodeHairdresser,
  useHaircodeWithMedia,
} from "@/src/api/haircodes";
import CustomAlert from "@/src/components/CustomAlert";
import { useAuth } from "@/src/providers/AuthProvider";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
  responsiveFontSize,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { Image as ExpoImage } from "expo-image";
import {
  VisitRecordDetailView,
  type VisitRecordDetailMedia,
} from "@/src/components/visits/VisitRecordDetailView";
import { signHaircodeVisitMedia } from "@/src/lib/storageSignedUrl";
import { formatDurationFromMinutes } from "@/src/utils/formatDurationFromFakeDate";
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

function recordDurationMin(r: ApiRecord | undefined, fallback: string): string {
  if (!r) return fallback;
  const m = r.durationMinutes ?? r.duration_minutes;
  if (m != null) return String(m);
  return fallback;
}

function recordPrice(r: ApiRecord | undefined, fallback: string): string {
  if (!r) return fallback;
  const p = r.price;
  if (p == null) return fallback;
  return String(p);
}

function recordCreatedBy(r: ApiRecord | undefined): string | undefined {
  if (!r) return undefined;
  const id = r.createdByUserId ?? r.created_by_user_id;
  return typeof id === "string" ? id : undefined;
}

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
    price,
    duration,
  } = useLocalSearchParams();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [showEditOptions, setShowEditOptions] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [signedMedia, setSignedMedia] = useState<VisitRecordDetailMedia[]>([]);

  const idStr = Array.isArray(haircodeId) ? haircodeId[0] : haircodeId ?? "";
  const { data: haircodeWithMedia, isLoading } = useHaircodeWithMedia(idStr);
  const record = haircodeWithMedia as ApiRecord | undefined;

  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { mutate: deleteHaircode } = useDeleteHaircodeHairdresser();

  const screenHeight = Dimensions.get("window").height;
  const carouselHeight = screenHeight * IMAGE_CROP_VIEWPORT_HEIGHT_RATIO;

  const createdByUserId = recordCreatedBy(haircodeWithMedia as ApiRecord);
  const canManage = Boolean(
    profile?.id && createdByUserId && profile.id === createdByUserId
  );

  const paramServices =
    typeof services === "string"
      ? services
      : Array.isArray(services)
      ? services.join(", ")
      : "";
  const mergedServices = recordServices(record, paramServices);
  const mergedDescription = recordSummary(
    record,
    typeof description === "string" ? description : ""
  );
  const mergedDuration = recordDurationMin(
    record,
    typeof duration === "string" ? duration : ""
  );
  const mergedPrice = recordPrice(record, typeof price === "string" ? price : "");

  const createdRaw = record?.createdAt ?? record?.created_at;
  const dateForDisplay = createdRaw
    ? new Date(String(createdRaw)).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : (typeof createdAt === "string"
        ? createdAt
        : Array.isArray(createdAt)
        ? createdAt[0]
        : "") ?? "";

  const durationMins = mergedDuration ? parseInt(String(mergedDuration), 10) : 0;
  const durationLabel =
    durationMins > 0 && !Number.isNaN(durationMins)
      ? formatDurationFromMinutes(durationMins)
      : "";

  const displayClientName =
    (Array.isArray(full_name) ? full_name.join(" ") : full_name)?.trim() ||
    "Client";
  const rawNumber = Array.isArray(number) ? number[0] : number;
  const phoneLine =
    rawNumber && String(rawNumber).trim().length > 0
      ? `Tlf: ${String(rawNumber).trim()}`
      : "";

  const proName =
    typeof hairdresserName === "string" ? hairdresserName : "";
  const proSalon = typeof salon_name === "string" ? salon_name : "";
  const proPic =
    typeof hairdresser_profile_pic === "string" ? hairdresser_profile_pic : "";

  const professionCode: ProfessionChoiceCode = professionCodeForVisitRecord(
    record,
    profile?.profession_codes
  );

  const openProfessionalPublicProfile = useCallback(() => {
    const pid =
      typeof createdByUserId === "string" && createdByUserId ? createdByUserId : "";
    if (!pid) return;
    router.push({
      pathname: "/haircodes/other_professional_profile",
      params: { hairdresser_id: pid },
    });
  }, [createdByUserId]);

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
  }, [haircodeWithMedia, idStr]);

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
    setIsDeleteConfirmVisible(false);
    setShowEditOptions(true);
  };

  const editHaircode = async () => {
    try {
      const haircode = haircodeWithMedia as ApiRecord | undefined;
      if (!haircode?.createdAt && !haircode?.created_at) {
        Alert.alert("Error", "Haircode not found.");
        return;
      }
      const createdAtDate = new Date(
        String(haircode.createdAt ?? haircode.created_at)
      );
      const now = new Date();
      const daysDiff = (now.getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 7) {
        setShowEditOptions(false);
        return;
      }

      router.replace({
        pathname: "/haircodes/new_haircode",
        params: {
          haircodeId: idStr,
          services: mergedServices,
          description: mergedDescription,
          price: mergedPrice,
          duration: mergedDuration,
          media: JSON.stringify(record?.media ?? []),
          clientId: String(haircode.clientUserId ?? haircode.client_user_id ?? ""),
          hairdresserName: proName,
          full_name: displayClientName,
          number: rawNumber != null ? String(rawNumber) : "",
          salon_name: proSalon,
          hairdresser_profile_pic: proPic,
        },
      });
    } catch (error) {
      console.error("Error editing haircode:", error);
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const haircode = haircodeWithMedia as ApiRecord | undefined;
      if (!haircode?.createdAt && !haircode?.created_at) {
        Alert.alert("Error", "Haircode not found.");
        return;
      }
      const createdAtDate = new Date(
        String(haircode.createdAt ?? haircode.created_at)
      );
      const now = new Date();
      const daysDiff = (now.getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 7) {
        setShowEditOptions(false);
        return;
      }

      setIsDeleteConfirmVisible(true);
    } catch (error) {
      console.error("Error checking haircode age:", error);
      Alert.alert("Error", "Could not verify deletion eligibility.");
    }
  };

  const handleDelete = (hid: string, hairdresserId: string) => {
    deleteHaircode({ haircodeId: hid, hairdresserId });
  };

  const modalContent = isDeleteConfirmVisible ? (
    <View style={styles.confirmationContainer}>
      <Text style={styles.confirmationText}>
        Are you sure you want to delete this haircode?
      </Text>
      <Pressable
        onPress={() => handleDelete(idStr, profile?.id ?? "")}
        style={styles.deleteButton}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </Pressable>
      <Pressable onPress={toggleModal} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
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
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <VisitRecordScreenHeader
          title={displayClientName}
          subtitle={phoneLine || undefined}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryBlack} />
          <Text style={styles.loadingText}>Loading visit…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showPriceRow = Boolean(profile?.id && createdByUserId === profile.id);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <CustomAlert
        visible={alertVisible}
        title="Sorry!"
        message="Haircode can only be edited within 7 days of creation."
        onClose={() => setAlertVisible(false)}
      />
      <View style={styles.body}>
        {canManage ? (
          <Pressable
            onPress={toggleModal}
            style={[
              styles.menuFab,
              { top: Math.max(insets.top, responsivePadding(6)) },
            ]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Visit actions"
          >
            <DotsThree size={responsiveScale(32)} color={primaryBlack} />
          </Pressable>
        ) : null}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <VisitRecordScreenHeader
            title={displayClientName}
            subtitle={phoneLine || undefined}
          />

          <VisitRecordDetailView
          dateText={dateForDisplay}
          serviceText={mergedServices}
          commentText={mergedDescription}
          showDurationRow
          showPriceRow={showPriceRow}
          durationText={durationLabel}
          priceText={mergedPrice}
          professionCode={professionCode}
          professional={{
            full_name: proName,
            salon_name: proSalon?.trim() ? proSalon : undefined,
            avatar_url: proPic || undefined,
          }}
          mediaSlides={signedMedia}
          carouselHeight={carouselHeight}
          onPressProfessional={openProfessionalPublicProfile}
          />
        </ScrollView>
      </View>

      <SmallDraggableModal
        isVisible={isModalVisible}
        onClose={toggleModal}
        modalHeight={"50%"}
        renderContent={modalContent}
      />
    </SafeAreaView>
  );
};

export default SingleHaircode;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  body: {
    flex: 1,
    position: "relative",
  },
  scroll: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scrollContent: {
    flexGrow: 1,
  },
  menuFab: {
    position: "absolute",
    right: responsivePadding(12),
    zIndex: 4,
    padding: responsivePadding(8),
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
    color: primaryBlack,
    marginTop: responsiveMargin(12),
  },
  confirmationContainer: {
    paddingHorizontal: responsivePadding(20),
    alignItems: "center",
  },
  confirmationText: {
    fontSize: responsiveFontSize(16, 14),
    color: primaryBlack,
    fontFamily: "Inter-SemiBold",
    textAlign: "center",
    marginTop: responsiveScale(20),
  },
  deleteButton: {
    backgroundColor: primaryBlack,
    marginTop: responsiveScale(40),
    padding: responsivePadding(15),
    borderRadius: responsiveScale(40),
    width: "90%",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: primaryWhite,
    borderColor: primaryBlack,
    borderWidth: responsiveScale(2),
    marginTop: responsiveScale(32),
    padding: responsivePadding(15),
    borderRadius: responsiveScale(40),
    width: "90%",
    alignItems: "center",
  },
  deleteButtonText: {
    color: primaryWhite,
    fontSize: responsiveFontSize(16, 14),
    fontFamily: "Inter-SemiBold",
  },
  cancelButtonText: {
    color: primaryBlack,
    fontSize: responsiveFontSize(16, 14),
    fontFamily: "Inter-SemiBold",
  },
  sorryContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: responsivePadding(20),
  },
  sorryText: {
    fontSize: responsiveFontSize(20, 18),
    fontFamily: "Inter-Bold",
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveScale(30),
  },
  messageText: {
    fontSize: responsiveFontSize(16, 14),
    fontFamily: "Inter-SemiBold",
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveScale(30),
  },
  closeButton: {
    backgroundColor: primaryGreen,
    paddingVertical: responsivePadding(10),
    paddingHorizontal: responsivePadding(20),
    borderRadius: responsiveScale(10),
    borderColor: primaryBlack,
    borderWidth: responsiveScale(1),
  },
  closeButtonText: {
    color: primaryBlack,
    fontFamily: "Inter-SemiBold",
    fontSize: responsiveFontSize(14, 12),
  },
});
