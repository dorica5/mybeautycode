import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { ResizeMode, Video } from "expo-av";
import InspirationTopNav from "@/src/components/InspirationTopNav";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import OptimizedImage from "@/src/components/OptimizedImage";
import { VisitPreviewSizedVideo } from "@/src/components/visits/VisitPreviewModalContent";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/apiClient";
import { prefetchHaircodeWithMedia } from "@/src/api/visits";
import { useResolvedListProfessionCode } from "@/src/hooks/useResolvedListProfessionCode";
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
import { Images, Play } from "phosphor-react-native";
import { useI18n } from "@/src/providers/LanguageProvider";
import { useVisitScreenGate } from "@/src/hooks/useVisitScreenGate";

const NUM_COLUMNS = 2;

type GalleryRow = {
  haircode_id: string;
  media_url: string;
  media_type: string;
};

function isVideoMedia(row: GalleryRow): boolean {
  return (row.media_type ?? "").toLowerCase() === "video";
}

function GalleryGridVideoThumb({
  signedUrl,
  cellSize,
}: {
  signedUrl?: string;
  cellSize: number;
}) {
  if (!signedUrl) {
    return (
      <View
        style={[
          styles.image,
          styles.videoThumbPlaceholder,
          { width: cellSize, height: cellSize },
        ]}
      >
        <ActivityIndicator size="small" color={primaryBlack} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.image,
        styles.imageRounded,
        { width: cellSize, height: cellSize },
      ]}
    >
      <Video
        source={{ uri: signedUrl }}
        style={styles.mediaThumbFill}
        videoStyle={styles.mediaThumbFill}
        resizeMode={ResizeMode.COVER}
        useNativeControls={false}
        isMuted
        shouldPlay={false}
      />
      <View style={styles.videoPlayOverlay} pointerEvents="none">
        <Play
          size={responsiveScale(28)}
          color={primaryWhite}
          weight="fill"
        />
      </View>
    </View>
  );
}

const ViewGallery = () => {
  const { t } = useI18n();
  useVisitScreenGate("view");
  const queryClient = useQueryClient();
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

  const { code: galleryProfessionCode, ready: galleryProfessionReady } =
    useResolvedListProfessionCode(professionCodeParam);

  const clientIdStr =
    typeof clientId === "string" ? clientId : Array.isArray(clientId) ? clientId[0] : "";
  const displayName =
    typeof clientName === "string"
      ? clientName
      : Array.isArray(clientName)
      ? clientName[0]
      : t("visits.gallery");

  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [startingIndex, setStartingIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [signedUrlMap, setSignedUrlMap] = useState<Record<string, string>>({});
  const [detailForHaircodeId, setDetailForHaircodeId] = useState<string | null>(
    null
  );

  const galleryItems = useMemo(
    () => rows.filter((r) => Boolean(r.media_url)),
    [rows]
  );

  const carouselKeyForItem = useCallback((item: GalleryRow) => {
    return `${item.haircode_id}::${item.media_url}`;
  }, []);

  const carouselBatchKey = useMemo(() => {
    return galleryItems.map(carouselKeyForItem).join("|");
  }, [galleryItems, carouselKeyForItem]);

  useEffect(() => {
    const run = async () => {
      if (!clientIdStr) {
        setRows([]);
        setLoading(false);
        return;
      }
      if (!galleryProfessionReady) {
        setLoading(true);
        return;
      }
      try {
        setLoading(true);
        const q = new URLSearchParams({ clientId: clientIdStr });
        if (galleryProfessionCode?.trim()) {
          q.set("professionCode", galleryProfessionCode.trim());
        }
        const media = await api.get<GalleryRow[]>(
          `/api/visits/client-gallery?${q.toString()}`
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
  }, [clientIdStr, galleryProfessionCode, galleryProfessionReady]);

  useEffect(() => {
    const items = galleryItems.filter(
      (it) =>
        it.media_url &&
        !String(it.media_url).startsWith("http") &&
        !String(it.media_url).startsWith("temp_")
    );
    if (items.length === 0) {
      setSignedUrlMap({});
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
      setSignedUrlMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [carouselBatchKey, galleryItems, carouselKeyForItem]);

  /** Warm visit detail for single_visit — never blocks the modal button. */
  useEffect(() => {
    if (!modalVisible || !detailForHaircodeId) return;
    void prefetchHaircodeWithMedia(queryClient, detailForHaircodeId);
  }, [modalVisible, detailForHaircodeId, queryClient]);

  const closeModal = () => {
    setModalVisible(false);
    setDetailForHaircodeId(null);
  };

  const handleGridPress = (item: GalleryRow) => {
    const index = galleryItems.findIndex(
      (it) =>
        it.haircode_id === item.haircode_id && it.media_url === item.media_url
    );
    const start = index >= 0 ? index : 0;
    setStartingIndex(start);
    setCurrentIndex(start);
    const first = galleryItems[start];
    if (first?.haircode_id) {
      setDetailForHaircodeId(first.haircode_id);
      void prefetchHaircodeWithMedia(queryClient, first.haircode_id);
    }
    setModalVisible(true);
  };

  const navigateToHaircode = () => {
    if (!detailForHaircodeId) return;
    const visitId = detailForHaircodeId;
    closeModal();
    router.push({
      pathname: "/visits/single_visit",
      params: {
        haircodeId: visitId,
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
            data={galleryItems}
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

              const itemKey = carouselKeyForItem(item);
              const signedUrl =
                signedUrlMap[itemKey] ||
                (String(item.media_url).startsWith("http")
                  ? item.media_url
                  : undefined);

              return (
                <Pressable
                  onPress={() => handleGridPress(item)}
                  style={[styles.imageContainer, { width: cellSize }]}
                >
                  {isVideoMedia(item) ? (
                    <GalleryGridVideoThumb
                      signedUrl={signedUrl}
                      cellSize={cellSize}
                    />
                  ) : (
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
                      recyclingKey={itemKey}
                      style={[
                        styles.image,
                        styles.imageRounded,
                        { width: cellSize, height: cellSize },
                      ]}
                      contentFit="cover"
                      priority="low"
                    />
                  )}
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
            contentContainerStyle={galleryItems.length === 0 ? styles.contentContainerEmpty : styles.contentContainer}
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
                  <Text style={styles.emptyStateTitle}>{t("visits.noPhotos")}</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    {t("visits.galleryEmptySubtitle")}
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

              {modalVisible && galleryItems.length > 0 ? (
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
                      data={galleryItems}
                      onSnapToItem={(index) => {
                        setCurrentIndex(index);
                        const snapped = galleryItems[index];
                        if (snapped?.haircode_id) {
                          setDetailForHaircodeId(snapped.haircode_id);
                        }
                      }}
                      defaultIndex={startingIndex}
                      renderItem={({ item, index }) => {
                        if (!item) {
                          return <View style={{ width, height: "100%" }} />;
                        }
                        const detailW = width - horizontalPadding * 2;
                        const imageBlockHeight = detailCarouselViewportHeight;

                        const key = carouselKeyForItem(item);
                        const fullSigned = signedUrlMap[key];
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
                            {isVideoMedia(item) ? (
                              displayUrl ? (
                                <VisitPreviewSizedVideo
                                  uri={displayUrl}
                                  maxWidth={detailW}
                                  maxHeight={imageBlockHeight}
                                  cornerRadius={responsiveBorderRadius(24)}
                                  isActive={index === currentIndex}
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.detailImageFrame,
                                    {
                                      width: detailW,
                                      height: imageBlockHeight,
                                    },
                                  ]}
                                >
                                  <ActivityIndicator
                                    size="large"
                                    color={primaryBlack}
                                  />
                                </View>
                              )
                            ) : (
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
                            )}
                          </View>
                        );
                      }}
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.detailFooter}>
                <PaddedLabelButton
                  title={t("visits.viewVisit")}
                  horizontalPadding={32}
                  verticalPadding={16}
                  onPress={navigateToHaircode}
                  disabled={!detailForHaircodeId}
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
  mediaThumbFill: {
    ...StyleSheet.absoluteFillObject,
  },
  imageRounded: {
    borderRadius: responsiveBorderRadius(18),
  },
  videoThumbPlaceholder: {
    borderRadius: responsiveBorderRadius(18),
    backgroundColor: `${primaryBlack}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
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
