import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import InspirationTopNav from "@/src/components/InspirationTopNav";
import OptimizedImage from "@/src/components/OptimizedImage";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import { coerceProfessionCode } from "@/src/constants/professionCodes";
import {
  contentCardMaxWidth,
  isTablet,
  responsiveBorderRadius,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
  scalePercent,
} from "@/src/utils/responsive";
import { api } from "@/src/lib/apiClient";
import { fetchSignedStorageUrls } from "@/src/lib/storageSignedUrl";
import {
  listPublicProfileWork,
  publicProfileWorkBucket,
  type PublicProfileWorkRow,
} from "@/src/api/publicProfileWork";

const NUM_COLS = 2;
const GRID_MAX_W = 400;

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

type Props = {
  profileUserId: string;
  /** When false, omit the built-in "My work" label (use when the parent already shows a section title). @default true */
  showTitle?: boolean;
  /**
   * When set (e.g. `"{first}'s work"` on public profile), shown instead of "My work" and only when there are items — avoids an orphan heading when the grid is empty.
   */
  sectionHeading?: string | null;
  /**
   * When set (e.g. viewer’s active professional role), loads that lane’s public work only.
   * When omitted, legacy: first linked profession on the profile.
   */
  professionCode?: string | null;
  /** When parent constrains readable column width (e.g. iPad shell), grids align to this. */
  contentMaxWidth?: number;
};

/**
 * Read-only 2-column grid of public portfolio images (Get discovered), for any profile viewer.
 * Tap opens a fullscreen swipeable carousel (same interaction model as visit gallery / inspiration).
 */
export function PublicProfileWorkGrid({
  profileUserId,
  showTitle = true,
  sectionHeading,
  professionCode: professionCodeProp,
  contentMaxWidth,
}: Props) {
  const [rows, setRows] = useState<PublicProfileWorkRow[]>([]);
  const tablet = isTablet();
  const { width: windowWidth, height: screenHeight } = useWindowDimensions();
  const safeInsets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [startingIndex, setStartingIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselFullUrls, setCarouselFullUrls] = useState<Record<string, string>>(
    {}
  );

  const scrollPad = responsivePadding(24, 28);
  const gap = responsiveScale(12);
  const shortSide = Math.min(windowWidth, screenHeight);
  const cap = tablet ? contentCardMaxWidth(shortSide) : GRID_MAX_W;

  let rowInner: number;
  if (typeof contentMaxWidth === "number" && Number.isFinite(contentMaxWidth)) {
    rowInner = Math.max(220, Math.min(cap, Math.floor(contentMaxWidth)));
  } else {
    rowInner = Math.min(cap, Math.max(120, windowWidth - scrollPad * 2));
  }
  const cell = (rowInner - gap * (NUM_COLS - 1)) / NUM_COLS;
  const pairRows = useMemo(() => chunkRows(rows, NUM_COLS), [rows]);

  const horizontalPadding = scalePercent(5);
  const detailCarouselViewportHeight = Math.min(
    screenHeight * 0.62,
    responsiveScale(520)
  );

  const carouselKey = useCallback((r: PublicProfileWorkRow) => r.id, []);

  const carouselBatchKey = useMemo(
    () => rows.map(carouselKey).join("|"),
    [rows, carouselKey]
  );

  useEffect(() => {
    const id = profileUserId.trim();
    if (!id) {
      setRows([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        let code =
          coerceProfessionCode(professionCodeProp ?? null) ?? null;
        if (!code) {
          const p = await api.get<{ profession_codes?: string[] }>(
            `/api/profiles/${encodeURIComponent(id)}`
          );
          if (cancelled) return;
          code =
            coerceProfessionCode(p.profession_codes?.[0] ?? null) ?? "hair";
        }
        const list = await listPublicProfileWork(id, code);
        if (cancelled) return;
        setRows(list.slice(0, 6));
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileUserId, professionCodeProp]);

  useEffect(() => {
    if (!modalVisible) {
      setCarouselFullUrls({});
      return;
    }
    const bucket = publicProfileWorkBucket();
    const items = rows.filter((r) => {
      const p = r.imageUrl?.trim();
      return (
        !!p &&
        !p.startsWith("http") &&
        !p.startsWith("temp_")
      );
    });
    if (items.length === 0) {
      setCarouselFullUrls({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const urls = await fetchSignedStorageUrls(
        items.map((r) => ({ bucket, path: r.imageUrl }))
      );
      if (cancelled) return;
      const map: Record<string, string> = {};
      items.forEach((r, i) => {
        const u = urls[i];
        if (u) map[carouselKey(r)] = u;
      });
      setCarouselFullUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [modalVisible, carouselBatchKey, rows, carouselKey]);

  const closeModal = () => setModalVisible(false);

  const openCarouselAt = (index: number) => {
    const start = Math.max(0, Math.min(index, rows.length - 1));
    setStartingIndex(start);
    setCurrentIndex(start);
    setModalVisible(true);
  };

  if (rows.length === 0) return null;

  const trimmedSection = sectionHeading?.trim();
  const heading =
    trimmedSection && trimmedSection.length > 0
      ? trimmedSection
      : showTitle
        ? "My work"
        : "";

  const modalTitle = heading || "Work";

  return (
    <View
      style={[
        styles.wrap,
        trimmedSection && trimmedSection.length > 0
          ? styles.wrapSectionBlock
          : null,
        { maxWidth: rowInner },
      ]}
    >
      {heading ? (
        <Text style={[Typography.label, styles.label]}>{heading}</Text>
      ) : null}
      <View style={[styles.grid, { width: rowInner }]}>
        {pairRows.map((row, rowIndex) => (
          <View
            key={`pf-row-${rowIndex}-${row[0]?.id ?? ""}`}
            style={[
              styles.row,
              rowIndex < pairRows.length - 1 ? { marginBottom: gap } : null,
            ]}
          >
            {row.map((cellItem, colIndex) => {
              const idx = rows.findIndex((r) => r.id === cellItem.id);
              const path =
                (cellItem.lowResImageUrl?.trim() &&
                cellItem.lowResImageUrl.length > 0
                  ? cellItem.lowResImageUrl
                  : cellItem.imageUrl) ?? "";
              return (
                <Pressable
                  key={cellItem.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open work image ${idx + 1} of ${rows.length}`}
                  onPress={() => openCarouselAt(idx)}
                  style={[
                    styles.thumbWrap,
                    {
                      width: cell,
                      height: cell,
                      marginRight:
                        colIndex === 0 && row.length > 1 ? gap : 0,
                    },
                  ]}
                >
                  <OptimizedImage
                    path={path}
                    bucket="public_profile_work"
                    sizePreset="inspiration-grid"
                    width={Math.ceil(cell)}
                    recyclingKey={cellItem.id}
                    style={[styles.thumb, { width: cell, height: cell }]}
                    contentFit="cover"
                    priority="low"
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
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
              <InspirationTopNav title={modalTitle} onBack={closeModal} />
            </View>

            {modalVisible && rows.length > 0 ? (
              <View style={styles.detailCarouselSection}>
                <View
                  style={[
                    styles.detailCarouselClip,
                    {
                      height: detailCarouselViewportHeight,
                      width: windowWidth,
                    },
                  ]}
                >
                  <Carousel
                    key={`${startingIndex}-${carouselBatchKey}`}
                    loop={false}
                    width={windowWidth}
                    height={detailCarouselViewportHeight}
                    autoPlay={false}
                    data={rows}
                    defaultIndex={startingIndex}
                    onSnapToItem={(index) => setCurrentIndex(index)}
                    renderItem={({ item }) => {
                      if (!item) {
                        return (
                          <View
                            style={{
                              width: windowWidth,
                              height: detailCarouselViewportHeight,
                            }}
                          />
                        );
                      }
                      const detailW = windowWidth - horizontalPadding * 2;
                      const key = carouselKey(item);
                      const fullSigned = carouselFullUrls[key];
                      const raw = item.imageUrl?.trim() ?? "";
                      const rawPath =
                        raw &&
                        !raw.startsWith("http") &&
                        !raw.startsWith("temp_")
                          ? raw
                          : undefined;
                      const displayUrl =
                        fullSigned || (raw.startsWith("http") ? raw : undefined);

                      return (
                        <View
                          style={[
                            styles.detailSlide,
                            {
                              width: windowWidth,
                              height: detailCarouselViewportHeight,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.detailImageFrame,
                              {
                                width: detailW,
                                height: detailCarouselViewportHeight,
                              },
                            ]}
                          >
                            <OptimizedImage
                              directUrl={displayUrl || undefined}
                              path={
                                !displayUrl && rawPath ? rawPath : undefined
                              }
                              bucket="public_profile_work"
                              sizePreset="fullscreen"
                              width={Math.ceil(detailW)}
                              style={styles.detailOptimizedImage}
                              contentFit="contain"
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

            <View style={styles.carouselFooter}>
              <Text style={styles.carouselCounter}>
                {currentIndex + 1} / {rows.length}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignSelf: "center",
    marginBottom: responsiveMargin(16),
  },
  /** Matches {@link PublicProfessionalProfileView} `sectionBlock` spacing when this grid carries the section title. */
  wrapSectionBlock: {
    marginBottom: responsiveMargin(36),
  },
  label: {
    color: primaryBlack,
    marginBottom: responsiveMargin(10),
    alignSelf: "flex-start",
  },
  grid: { marginBottom: responsiveMargin(4) },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
  },
  thumbWrap: {
    borderRadius: responsiveBorderRadius(18),
    overflow: "hidden",
  },
  thumb: {
    borderRadius: responsiveBorderRadius(18),
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
  carouselFooter: {
    paddingBottom: responsiveScale(20),
    paddingTop: responsiveScale(8),
    alignItems: "center",
  },
  carouselCounter: {
    ...Typography.bodySmall,
    color: `${primaryBlack}cc`,
  },
});
