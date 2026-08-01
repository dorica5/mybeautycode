import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { Image } from "expo-image";
import { Audio, ResizeMode, Video, type AVPlaybackStatus } from "expo-av";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { formatVisitServicesForDisplay } from "@/src/constants/profDiscoveryCategories";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import {
  professionLabelFromT,
  useI18n,
} from "@/src/providers/LanguageProvider";

export type VisitPreviewMediaItem = {
  uri?: string;
  type?: string;
};

export type VisitPreviewProfile = {
  full_name?: string | null;
  salon_name?: string | null;
  avatar_url?: string | null;
};

export type VisitPreviewModalContentProps = {
  onClose: () => void;
  professionCode: ProfessionChoiceCode;
  /** e.g. `Visit 4/5/26` (locale / country) */
  visitTitle: string;
  /** Same calendar date as in the title, shown in the Date row before Service */
  dateText: string;
  serviceText: string;
  commentText: string;
  /** e.g. `1h 30m` — empty hides the row */
  durationText: string;
  /** As entered in the form — empty hides the row */
  priceText: string;
  profile: VisitPreviewProfile | null | undefined;
  capturedMedia: VisitPreviewMediaItem[];
  carouselHeight: number;
};

export function PreviewArrowRightIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M0.5625 9H17.4375"
        stroke="#F1F9F4"
        strokeWidth={1.125}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.5625 16.875L17.4375 9L9.5625 1.125"
        stroke="#F1F9F4"
        strokeWidth={1.125}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PreviewArrowLeftIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <G transform="translate(18 0) scale(-1 1)">
        <Path
          d="M0.5625 9H17.4375"
          stroke="#F1F9F4"
          strokeWidth={1.125}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M9.5625 16.875L17.4375 9L9.5625 1.125"
          stroke="#F1F9F4"
          strokeWidth={1.125}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

function PreviewModalCloseX() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.04297 19.955L19.952 4.04504"
        stroke={primaryBlack}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19.952 19.955L4.04297 4.04504"
        stroke={primaryBlack}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Carousel slide image — fills the same maxW×maxH frame as videos (cover crop).
 */
export function VisitPreviewSizedImage({
  uri,
  maxWidth,
  maxHeight,
  cornerRadius,
  priority = "normal",
}: {
  uri: string;
  maxWidth: number;
  maxHeight: number;
  cornerRadius: number;
  /** First slide can use `"high"` for quicker decode priority. */
  priority?: "low" | "normal" | "high";
}) {
  return (
    <View
      style={[styles.slidePageCenter, { width: maxWidth, height: maxHeight }]}
    >
      <View
        style={[
          styles.roundedMediaChrome,
          {
            width: maxWidth,
            height: maxHeight,
            borderRadius: cornerRadius,
          },
        ]}
      >
        <Image
          source={{ uri }}
          style={styles.mediaFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority={priority}
          transition={0}
          recyclingKey={uri}
        />
      </View>
    </View>
  );
}

export function VisitPreviewSizedVideo({
  uri,
  maxWidth,
  maxHeight,
  cornerRadius,
  isActive = false,
}: {
  uri: string;
  maxWidth: number;
  maxHeight: number;
  cornerRadius: number;
  /** When true, playback starts; native controls allow pause, scrub, and fullscreen. */
  isActive?: boolean;
}) {
  const trimmedUri = uri?.trim() ?? "";
  const videoRef = useRef<Video>(null);
  const wasActiveRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    wasActiveRef.current = false;
    wasPlayingRef.current = false;
  }, [trimmedUri]);

  useEffect(() => {
    if (!isActive) return;
    void Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});
  }, [isActive]);

  const startPlayback = useCallback(async () => {
    if (!isActiveRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.playAsync();
    } catch {
      // Retry when load callbacks fire.
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const becameActive = isActive && !wasActiveRef.current;
    const becameInactive = !isActive && wasActiveRef.current;
    wasActiveRef.current = isActive;

    if (!video) return;

    if (becameInactive) {
      wasPlayingRef.current = false;
      void (async () => {
        try {
          try {
            await video.dismissFullscreenPlayer();
          } catch {
            // Not in fullscreen — ignore.
          }
          await video.pauseAsync();
          await video.setPositionAsync(0);
        } catch {
          // Ignore unload races.
        }
      })();
      return;
    }

    if (becameActive) {
      void startPlayback();
    }
  }, [isActive, trimmedUri, startPlayback]);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.didJustFinish) {
      wasPlayingRef.current = false;
      void (async () => {
        try {
          await videoRef.current?.setPositionAsync(0);
          await videoRef.current?.pauseAsync();
        } catch {
          // Ignore unload races.
        }
      })();
      return;
    }

    const justStartedPlaying = status.isPlaying && !wasPlayingRef.current;
    wasPlayingRef.current = status.isPlaying;

    const duration = status.durationMillis ?? 0;
    const atEnd = duration > 0 && status.positionMillis >= duration - 500;
    if (justStartedPlaying && atEnd) {
      void (async () => {
        try {
          await videoRef.current?.setPositionAsync(0);
          await videoRef.current?.playAsync();
        } catch {
          // Ignore unload races.
        }
      })();
    }
  }, []);

  if (!trimmedUri) {
    return (
      <View
        style={[styles.slidePageCenter, { width: maxWidth, height: maxHeight }]}
      />
    );
  }

  return (
    <View
      style={[styles.slidePageCenter, { width: maxWidth, height: maxHeight }]}
    >
      <View
        style={[
          styles.roundedMediaChrome,
          {
            width: maxWidth,
            height: maxHeight,
            borderRadius: cornerRadius,
          },
        ]}
      >
        <Video
          ref={videoRef}
          source={{ uri: trimmedUri }}
          style={styles.mediaFill}
          videoStyle={styles.mediaFill}
          useNativeControls
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isLooping={false}
          progressUpdateIntervalMillis={250}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          onReadyForDisplay={() => {
            void startPlayback();
          }}
          onLoad={() => {
            void startPlayback();
          }}
        />
      </View>
    </View>
  );
}

export function PreviewDots({ length, active }: { length: number; active: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === active ? styles.dotActive : styles.dotPassive,
          ]}
        />
      ))}
    </View>
  );
}

export function VisitPreviewModalContent({
  onClose,
  professionCode,
  visitTitle,
  dateText,
  serviceText,
  commentText,
  durationText,
  priceText,
  profile,
  capturedMedia,
  carouselHeight,
}: VisitPreviewModalContentProps) {
  const { t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  /** Match `root` horizontal padding so slides are not wider than the visible frame (avoids side clipping). */
  const carouselTrackWidth = Math.max(
    1,
    Math.round(windowWidth - 2 * responsivePadding(20))
  );
  const previewScrollRef = useRef<ScrollView>(null);
  const mediaSlides = capturedMedia.filter((m) => Boolean(m.uri));
  const hasMedia = mediaSlides.length > 0;
  const slideCount = mediaSlides.length;
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    setActiveSlide(0);
    previewScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [hasMedia, slideCount, capturedMedia.length]);

  const professionalLabel = `${professionLabelFromT(t, professionCode)}:`;
  const displayDate = dateText?.trim() ? dateText : "";
  const displayService = formatVisitServicesForDisplay(
    serviceText,
    professionCode,
    t
  );
  const displayComment = commentText?.trim() ? commentText : "";
  const displayDuration = durationText?.trim() ? durationText : "";
  const displayPrice = priceText?.trim() ? priceText : "";
  const previewMediaRadius = responsiveScale(20);

  const goPrev = () => {
    const next = Math.max(0, activeSlide - 1);
    previewScrollRef.current?.scrollTo({
      x: next * carouselTrackWidth,
      animated: true,
    });
    setActiveSlide(next);
  };

  const goNext = () => {
    const next = Math.min(slideCount - 1, activeSlide + 1);
    previewScrollRef.current?.scrollTo({
      x: next * carouselTrackWidth,
      animated: true,
    });
    setActiveSlide(next);
  };

  const syncSlideFromScrollX = useCallback(
    (x: number) => {
      if (slideCount <= 0 || carouselTrackWidth <= 0) return;
      const next = Math.min(
        slideCount - 1,
        Math.max(0, Math.round(x / carouselTrackWidth))
      );
      setActiveSlide((prev) => (prev !== next ? next : prev));
    },
    [slideCount, carouselTrackWidth]
  );

  const onPreviewScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncSlideFromScrollX(e.nativeEvent.contentOffset.x);
    },
    [syncSlideFromScrollX]
  );

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onClose}
        style={styles.closeHeader}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("visits.closePreview")}
      >
        <Text style={[Typography.label, styles.closeLabel]}>{t("common.close")}</Text>
        <PreviewModalCloseX />
      </Pressable>

      <Text style={[Typography.h3, styles.visitTitle]} accessibilityRole="header">
        {visitTitle}
      </Text>

      <View style={styles.block}>
        <Text style={[Typography.label, styles.fieldLabel]}>{t("visits.dateLabel")}</Text>
        <Text style={[Typography.bodyMedium, styles.fieldValue]}>
          {displayDate}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={[Typography.label, styles.fieldLabel]}>{t("visits.serviceLabel")}</Text>
        <Text style={[Typography.bodyMedium, styles.fieldValue]}>
          {displayService}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={[Typography.label, styles.fieldLabel]}>
          {t("visits.serviceDescriptionLabel")}
        </Text>
        <Text style={[Typography.bodyMedium, styles.fieldValue]}>
          {displayComment}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={[Typography.label, styles.fieldLabel]}>{t("visits.durationLabel")}</Text>
        <Text style={[Typography.bodyMedium, styles.fieldValue]}>
          {displayDuration}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={[Typography.label, styles.fieldLabel]}>{t("visits.priceLabel")}</Text>
        <Text style={[Typography.bodyMedium, styles.fieldValue]}>
          {displayPrice}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={[Typography.label, styles.fieldLabel]}>
          {professionalLabel}
        </Text>
        <View style={styles.proCard}>
          <AvatarWithSpinner
            uri={profile?.avatar_url}
            size={responsiveScale(48)}
            style={[
              styles.proAvatar,
              !profile?.avatar_url && styles.proAvatarFallback,
            ]}
          />
          <View style={styles.proTextCol}>
            <Text style={[Typography.bodyMedium, styles.fieldValue]}>
              {profile?.full_name?.trim()
                ? profile.full_name
                : ""}
            </Text>
            {profile?.salon_name?.trim() ? (
              <Text style={[Typography.bodyMedium, styles.fieldValue]}>
                {profile.salon_name}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {hasMedia ? (
        <>
          <View
            style={[styles.carouselWrap, { height: carouselHeight }]}
            collapsable={false}
            needsOffscreenAlphaCompositing={Platform.OS === "android"}
          >
            <ScrollView
              ref={previewScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              onScroll={onPreviewScroll}
              scrollEventThrottle={16}
              onMomentumScrollEnd={onPreviewScroll}
              style={[
                styles.carouselScrollViewport,
                {
                  width: carouselTrackWidth,
                  height: carouselHeight,
                },
              ]}
              contentContainerStyle={styles.carouselScrollRow}
            >
              {mediaSlides.map((item, index) => (
                <View
                  key={item.uri ?? `slide-${index}`}
                  style={[
                    styles.slidePage,
                    {
                      width: carouselTrackWidth,
                      height: carouselHeight,
                    },
                  ]}
                >
                  {item.type === "image" && item.uri ? (
                    <VisitPreviewSizedImage
                      uri={item.uri}
                      maxWidth={carouselTrackWidth}
                      maxHeight={carouselHeight}
                      cornerRadius={previewMediaRadius}
                      priority={index === 0 ? "high" : "normal"}
                    />
                  ) : item.type === "video" && item.uri ? (
                    <VisitPreviewSizedVideo
                      uri={item.uri}
                      maxWidth={carouselTrackWidth}
                      maxHeight={carouselHeight}
                      cornerRadius={previewMediaRadius}
                      isActive={index === activeSlide}
                    />
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.navRow}>
            <Pressable
              onPress={goPrev}
              disabled={activeSlide <= 0}
              style={[
                styles.navCircle,
                activeSlide <= 0 && styles.navCircleDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("visits.previousImage")}
            >
              <PreviewArrowLeftIcon />
            </Pressable>

            <View style={styles.dotsCenter}>
              <PreviewDots length={slideCount} active={activeSlide} />
            </View>

            <Pressable
              onPress={goNext}
              disabled={activeSlide >= slideCount - 1}
              style={[
                styles.navCircle,
                activeSlide >= slideCount - 1 && styles.navCircleDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("visits.nextImage")}
            >
              <PreviewArrowRightIcon />
            </Pressable>
          </View>
        </>
      ) : null}

      <PaddedLabelButton
        title={t("visits.closePreview")}
        horizontalPadding={32}
        verticalPadding={16}
        onPress={onClose}
        style={[
          styles.closePreviewButton,
          !hasMedia && styles.closePreviewButtonNoMedia,
        ]}
        textStyle={styles.closePreviewButtonLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    backgroundColor: primaryGreen,
    paddingHorizontal: responsivePadding(20),
    paddingBottom: responsiveMargin(28),
  },
  closeHeader: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: responsiveMargin(6),
    marginTop: responsiveMargin(4),
    marginBottom: responsiveMargin(28),
  },
  closeLabel: {
    color: primaryBlack,
  },
  visitTitle: {
    color: primaryBlack,
    textAlign: "center",
    marginTop: responsiveMargin(4),
    marginBottom: responsiveMargin(22),
  },
  block: {
    marginBottom: responsiveMargin(18),
  },
  fieldLabel: {
    color: primaryBlack,
    marginBottom: responsiveMargin(6),
  },
  fieldValue: {
    color: primaryBlack,
  },
  proCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(18),
    borderWidth: 1,
    borderColor: primaryBlack,
    paddingVertical: responsivePadding(14),
    paddingHorizontal: responsivePadding(16),
    gap: responsiveMargin(14),
  },
  proAvatar: {
    borderRadius: responsiveScale(24),
  },
  proAvatarFallback: {
    opacity: 0.85,
  },
  proTextCol: {
    flex: 1,
    gap: responsiveMargin(4),
  },
  /** Clip horizontal scroll only; stroke lives on each sized media chrome. */
  carouselWrap: {
    width: "100%",
    marginTop: responsiveMargin(8),
    marginBottom: responsiveMargin(12),
    borderRadius: responsiveScale(20),
    overflow: "hidden",
    alignSelf: "center",
    backgroundColor: primaryGreen,
  },
  carouselScrollViewport: {
    backgroundColor: primaryGreen,
  },
  carouselScrollRow: {
    flexDirection: "row",
  },
  slidePage: {
    overflow: "hidden",
    backgroundColor: primaryGreen,
  },
  slidePageCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: primaryGreen,
  },
  roundedMediaChrome: {
    borderWidth: 1,
    borderColor: primaryBlack,
    overflow: "hidden",
    backgroundColor: primaryGreen,
    position: "relative",
  },
  mediaFill: {
    ...StyleSheet.absoluteFillObject,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsiveMargin(24),
    paddingHorizontal: responsivePadding(4),
  },
  dotsCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navCircle: {
    width: responsiveScale(44),
    height: responsiveScale(44),
    borderRadius: responsiveScale(22),
    backgroundColor: primaryBlack,
    alignItems: "center",
    justifyContent: "center",
  },
  navCircleDisabled: {
    opacity: 0.38,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveMargin(10),
  },
  dot: {
    width: responsiveScale(9),
    height: responsiveScale(9),
    borderRadius: responsiveScale(5),
  },
  dotActive: {
    backgroundColor: primaryBlack,
  },
  dotPassive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: primaryBlack,
  },
  closePreviewButton: {
    alignSelf: "center",
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
  closePreviewButtonNoMedia: {
    marginTop: responsiveMargin(40),
  },
  closePreviewButtonLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
});
