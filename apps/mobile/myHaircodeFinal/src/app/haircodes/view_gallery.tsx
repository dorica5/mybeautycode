import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Carousel from "react-native-reanimated-carousel";
import InspirationTopNav from "@/src/components/InspirationTopNav";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import OptimizedImage from "@/src/components/OptimizedImage";
import { api } from "@/src/lib/apiClient";
import { fetchSignedStorageUrls } from "@/src/lib/storageSignedUrl";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
  secondaryGreen,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  scalePercent,
  responsiveScale,
  responsiveFontSize,
  responsiveBorderRadius,
  responsiveMargin,
} from "@/src/utils/responsive";
import { Images } from "phosphor-react-native";

const NUM_COLUMNS = 2;

type GalleryRow = {
  haircode_id: string;
  media_url: string;
  media_type: string;
};

type HaircodeDetailBundle = {
  id: string;
  hairdresser_id: string;
  hairdresser_name: string;
  created_at: string;
  service_description: string;
  services: string;
  price: string;
  hairdresser_profile: {
    id: string;
    avatar_url: string;
    salon_name: string;
    salon_phone_number: string;
    about_me: string;
    booking_site: string;
    social_media: string;
  };
};

function isImageMedia(row: GalleryRow): boolean {
  return (row.media_type ?? "").toLowerCase() === "image";
}

const ViewGallery = () => {
  const { clientId, clientName, professionCode: professionCodeParam } =
    useLocalSearchParams();
  const safeInsets = useSafeAreaInsets();
  const width = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const horizontalPadding = scalePercent(5);
  const columnGap = responsiveScale(12);
  const gridInnerWidth = width - horizontalPadding * 2;
  const cellSize = (gridInnerWidth - columnGap) / NUM_COLUMNS;
  const detailCarouselViewportHeight = Math.min(
    screenHeight * 0.62,
    responsiveScale(520)
  );

  const professionCode =
    typeof professionCodeParam === "string"
      ? professionCodeParam
      : Array.isArray(professionCodeParam)
      ? professionCodeParam[0]
      : "";

  const clientIdStr =
    typeof clientId === "string" ? clientId : Array.isArray(clientId) ? clientId[0] : "";
  const displayName =
    typeof clientName === "string"
      ? clientName
      : Array.isArray(clientName)
      ? clientName[0]
      : "Gallery";

  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [startingIndex, setStartingIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselFullUrls, setCarouselFullUrls] = useState<Record<string, string>>(
    {}
  );
  const [detailForHaircodeId, setDetailForHaircodeId] = useState<string | null>(
    null
  );
  const [haircodeDetails, setHaircodeDetails] = useState<HaircodeDetailBundle | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const imageItems = useMemo(
    () => rows.filter((r) => r.media_url && isImageMedia(r)),
    [rows]
  );

  const carouselKeyForItem = useCallback((item: GalleryRow) => {
    return `${item.haircode_id}::${item.media_url}`;
  }, []);

  const carouselBatchKey = useMemo(() => {
    return imageItems.map(carouselKeyForItem).join("|");
  }, [imageItems, carouselKeyForItem]);

  useEffect(() => {
    const run = async () => {
      if (!clientIdStr) {
        setRows([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const q = new URLSearchParams({ clientId: clientIdStr });
        if (professionCode?.trim()) {
          q.set("professionCode", professionCode.trim());
        }
        const media = await api.get<GalleryRow[]>(
          `/api/haircodes/client-gallery?${q.toString()}`
        );
        setRows(Array.isArray(media) ? media : []);
      } catch (e) {
        console.error("view_gallery fetch error:", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [clientIdStr, professionCode]);

  useEffect(() => {
    if (!modalVisible) {
      setCarouselFullUrls({});
      return;
    }
    const items = imageItems.filter(
      (it) =>
        it.media_url &&
        !String(it.media_url).startsWith("http") &&
        !String(it.media_url).startsWith("temp_")
    );
    if (items.length === 0) {
      setCarouselFullUrls({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const urls = await fetchSignedStorageUrls(
        items.map((g) => ({ bucket: "haircode_images", path: g.media_url }))
      );
      if (cancelled) return;
      const map: Record<string, string> = {};
      items.forEach((g, i) => {
        const u = urls[i];
        if (u) map[carouselKeyForItem(g)] = u;
      });
      setCarouselFullUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [modalVisible, carouselBatchKey, imageItems, carouselKeyForItem]);

  const fetchHaircodeBundle = useCallback(async (haircodeId: string) => {
    try {
      const haircode = await api.get<{
        id: string;
        createdByUserId?: string;
        created_by_user_id?: string;
        hairdresserId?: string;
        createdAt?: string;
        created_at?: string;
        serviceDescription?: string;
        summary?: string;
        services?: string;
        price?: string | number;
        recordData?: { services?: string };
        hairdresserName?: string;
      }>(`/api/haircodes/${haircodeId}`);

      const hid =
        haircode.createdByUserId ??
        haircode.created_by_user_id ??
        haircode.hairdresserId ??
        (haircode as { hairdresser_id?: string }).hairdresser_id;
      if (!hid) throw new Error("Missing professional");

      const hairdresserProfile = await api.get<{
        id: string;
        fullName?: string;
        full_name?: string;
        avatarUrl?: string;
        salonName?: string;
        salonPhoneNumber?: string;
        aboutMe?: string;
        bookingSite?: string;
        socialMedia?: string;
      }>(`/api/profiles/${hid}`);

      const createdRaw = haircode.createdAt ?? haircode.created_at;
      const servicesFromRecord =
        haircode.services ??
        haircode.recordData?.services ??
        "";

      const proDisplayName =
        hairdresserProfile.fullName ??
        hairdresserProfile.full_name ??
        haircode.hairdresserName ??
        "";

      const bundle: HaircodeDetailBundle = {
        id: haircode.id,
        hairdresser_id: hid,
        hairdresser_name: proDisplayName,
        created_at: createdRaw ? String(createdRaw) : "",
        service_description:
          haircode.serviceDescription ?? haircode.summary ?? "",
        services: servicesFromRecord,
        price:
          haircode.price != null ? String(haircode.price) : "",
        hairdresser_profile: {
          id: hairdresserProfile.id,
          avatar_url: hairdresserProfile.avatarUrl ?? "",
          salon_name: hairdresserProfile.salonName ?? "",
          salon_phone_number: hairdresserProfile.salonPhoneNumber ?? "",
          about_me: hairdresserProfile.aboutMe ?? "",
          booking_site: hairdresserProfile.bookingSite ?? "",
          social_media:
            typeof hairdresserProfile.socialMedia === "string"
              ? hairdresserProfile.socialMedia
              : JSON.stringify(hairdresserProfile.socialMedia ?? {}),
        },
      };
      setHaircodeDetails(bundle);
    } catch (err) {
      console.error("view_gallery haircode fetch:", err);
      setHaircodeDetails(null);
      Alert.alert("Error", "Could not load visit details.");
    }
  }, []);

  useEffect(() => {
    if (!modalVisible || !detailForHaircodeId) {
      setHaircodeDetails(null);
      return;
    }
    setHaircodeDetails(null);
    let cancelled = false;
    void (async () => {
      setDetailLoading(true);
      try {
        await fetchHaircodeBundle(detailForHaircodeId);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalVisible, detailForHaircodeId, fetchHaircodeBundle]);

  const closeModal = () => {
    setModalVisible(false);
    setDetailForHaircodeId(null);
    setHaircodeDetails(null);
  };

  const handleGridPress = (item: GalleryRow) => {
    const index = imageItems.findIndex(
      (it) =>
        it.haircode_id === item.haircode_id && it.media_url === item.media_url
    );
    const start = index >= 0 ? index : 0;
    setStartingIndex(start);
    setCurrentIndex(start);
    const first = imageItems[start];
    if (first) {
      setDetailForHaircodeId(first.haircode_id);
    }
    setModalVisible(true);
  };

  const navigateToHaircode = () => {
    if (!haircodeDetails) return;
    closeModal();
    router.push({
      pathname: "/haircodes/single_haircode",
      params: {
        haircodeId: haircodeDetails.id,
        hairdresserName: haircodeDetails.hairdresser_name,
        hairdresser_profile_pic: haircodeDetails.hairdresser_profile.avatar_url,
        description: haircodeDetails.service_description,
        services: haircodeDetails.services,
        createdAt: new Date(haircodeDetails.created_at).toLocaleDateString(
          "en-GB"
        ),
        salon_name: haircodeDetails.hairdresser_profile.salon_name,
        salonPhoneNumber: haircodeDetails.hairdresser_profile.salon_phone_number,
        about_me: haircodeDetails.hairdresser_profile.about_me,
        booking_site: haircodeDetails.hairdresser_profile.booking_site,
        social_media: haircodeDetails.hairdresser_profile.social_media,
        price: haircodeDetails.price,
        full_name: displayName,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingRoot} edges={["top"]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={primaryBlack} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.topNav}>
          <InspirationTopNav title={displayName} />
        </View>

        <View style={styles.galleryContainer}>
          <FlatList
            key="visit-gallery-grid"
            style={styles.galleryList}
            data={imageItems}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS === "android"}
            renderItem={({ item }) => {
              if (!item?.media_url) return null;
              const rawPath =
                item.media_url &&
                !String(item.media_url).startsWith("http") &&
                !String(item.media_url).startsWith("temp_")
                  ? String(item.media_url)
                  : undefined;
              if (!rawPath && !String(item.media_url).startsWith("http")) {
                return null;
              }

              return (
                <Pressable
                  onPress={() => handleGridPress(item)}
                  style={[styles.imageContainer, { width: cellSize }]}
                >
                  <OptimizedImage
                    directUrl={
                      String(item.media_url).startsWith("http")
                        ? item.media_url
                        : undefined
                    }
                    path={
                      !String(item.media_url).startsWith("http")
                        ? item.media_url
                        : undefined
                    }
                    bucket="haircode_images"
                    sizePreset="inspiration-grid"
                    width={Math.ceil(cellSize)}
                    recyclingKey={carouselKeyForItem(item)}
                    style={[
                      styles.image,
                      styles.imageRounded,
                      { width: cellSize, height: cellSize },
                    ]}
                    contentFit="cover"
                    priority="low"
                  />
                </Pressable>
              );
            }}
            keyExtractor={(item, index) => carouselKeyForItem(item) + index}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={{
              paddingHorizontal: horizontalPadding,
              gap: columnGap,
              marginBottom: columnGap,
            }}
            contentContainerStyle={imageItems.length === 0 ? styles.contentContainerEmpty : styles.contentContainer}
            ListEmptyComponent={
              <View
                style={[
                  styles.emptyStateWrapper,
                  {
                    minHeight: Math.max(
                      screenHeight * 0.44,
                      responsiveScale(300)
                    ),
                  },
                ]}
              >
                <View style={styles.emptyStateCard}>
                  <View style={styles.emptyStateIconCircle}>
                    <Images
                      size={responsiveScale(36)}
                      color={primaryBlack}
                      weight="duotone"
                    />
                  </View>
                  <Text style={styles.emptyStateTitle}>No visit photos yet</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Photos from this client&apos;s visits for your current
                    professional profile will appear here.
                  </Text>
                </View>
              </View>
            }
          />
        </View>

        <Modal
          animationType="slide"
          transparent
          visible={modalVisible}
          onRequestClose={closeModal}
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
                <InspirationTopNav title={displayName} onBack={closeModal} />
              </View>

              {modalVisible && imageItems.length > 0 ? (
                <View style={styles.detailCarouselSection}>
                  <View
                    style={[
                      styles.detailCarouselClip,
                      { height: detailCarouselViewportHeight, width },
                    ]}
                  >
                    <Carousel
                      key={`${startingIndex}-${carouselBatchKey}`}
                      loop={false}
                      width={width}
                      height={detailCarouselViewportHeight}
                      autoPlay={false}
                      data={imageItems}
                      onSnapToItem={(index) => {
                        setCurrentIndex(index);
                        const snapped = imageItems[index];
                        if (snapped?.haircode_id) {
                          setDetailForHaircodeId(snapped.haircode_id);
                        }
                      }}
                      defaultIndex={startingIndex}
                      renderItem={({ item }) => {
                        if (!item) {
                          return <View style={{ width, height: "100%" }} />;
                        }
                        const detailW = width - horizontalPadding * 2;
                        const imageBlockHeight = detailCarouselViewportHeight;

                        const key = carouselKeyForItem(item);
                        const fullSigned = carouselFullUrls[key];
                        const thumb = String(item.media_url ?? "");
                        const rawPath =
                          item.media_url &&
                          !String(item.media_url).startsWith("http") &&
                          !String(item.media_url).startsWith("temp_")
                            ? String(item.media_url)
                            : undefined;
                        const displayUrl =
                          fullSigned ||
                          (thumb.startsWith("http") ? thumb : undefined);

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
                              <OptimizedImage
                                directUrl={displayUrl || undefined}
                                path={
                                  !displayUrl && rawPath ? rawPath : undefined
                                }
                                bucket="haircode_images"
                                sizePreset="fullscreen"
                                width={Math.ceil(detailW)}
                                style={styles.detailOptimizedImage}
                                contentFit="cover"
                                priority="high"
                                transition={0}
                              />
                            </View>
                          </View>
                        );
                      }}
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.detailFooter}>
                <PaddedLabelButton
                  title={detailLoading ? "Loading…" : "View visit"}
                  horizontalPadding={32}
                  verticalPadding={16}
                  onPress={navigateToHaircode}
                  disabled={detailLoading || !haircodeDetails}
                  style={styles.visitPrimaryButton}
                  textStyle={styles.visitPrimaryButtonLabel}
                />
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: primaryGreen },
  loadingRoot: {
    flex: 1,
    backgroundColor: primaryGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  topNav: {
    paddingHorizontal: scalePercent(5),
    marginBottom: responsiveScale(4),
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
  contentContainerEmpty: {
    flexGrow: 1,
    paddingBottom: responsiveScale(28),
    width: "100%",
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
    paddingTop: responsiveScale(4),
    alignItems: "center",
    paddingHorizontal: scalePercent(5),
    zIndex: 20,
    elevation: 20,
  },
  visitPrimaryButton: {
    alignSelf: "center",
    marginTop: responsiveMargin(2),
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
  visitPrimaryButtonLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
});

export default ViewGallery;
