import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image as RNImage,
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
import { ResizeMode, Video } from "expo-av";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  PROFESSION_HEADLINE_ROLE,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

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

function PreviewArrowRightIcon() {
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

function PreviewArrowLeftIcon() {
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

/** `object-fit: contain` sizing: max box maxW×maxH, return drawn width/height. */
function containedDisplaySize(
  iw: number,
  ih: number,
  maxW: number,
  maxH: number
): { dw: number; dh: number } {
  if (iw <= 0 || ih <= 0 || maxW <= 0 || maxH <= 0) {
    return { dw: maxW, dh: maxH };
  }
  const ar = iw / ih;
  const boxAr = maxW / maxH;
  if (ar > boxAr) {
    return { dw: maxW, dh: maxW / ar };
  }
  return { dw: maxH * ar, dh: maxH };
}

/** Border + rounded rect match the photo bounds, not the full carousel slot. */
function VisitPreviewSizedImage({
  uri,
  maxWidth,
  maxHeight,
  cornerRadius,
}: {
  uri: string;
  maxWidth: number;
  maxHeight: number;
  cornerRadius: number;
}) {
  const [intrinsic, setIntrinsic] = useState<{ w: number; h: number } | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    RNImage.getSize(
      uri,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) {
          setIntrinsic({ w, h });
        }
      },
      () => {
        if (!cancelled) {
          setIntrinsic({ w: maxWidth, h: maxHeight });
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [uri, maxWidth, maxHeight]);

  if (!intrinsic) {
    return (
      <View
        style={[styles.slidePageCenter, { width: maxWidth, height: maxHeight }]}
      />
    );
  }

  const { dw, dh } = containedDisplaySize(
    intrinsic.w,
    intrinsic.h,
    maxWidth,
    maxHeight
  );

  return (
    <View
      style={[styles.slidePageCenter, { width: maxWidth, height: maxHeight }]}
    >
      <View
        style={[
          styles.roundedMediaChrome,
          { width: dw, height: dh, borderRadius: cornerRadius },
        ]}
      >
        <Image
          source={{ uri }}
          style={{ width: dw, height: dh }}
          contentFit="cover"
        />
      </View>
    </View>
  );
}

function VisitPreviewSizedVideo({
  uri,
  maxWidth,
  maxHeight,
  cornerRadius,
}: {
  uri: string;
  maxWidth: number;
  maxHeight: number;
  cornerRadius: number;
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const { dw, dh } = natural
    ? containedDisplaySize(natural.w, natural.h, maxWidth, maxHeight)
    : { dw: maxWidth, dh: maxHeight };

  return (
    <View
      style={[styles.slidePageCenter, { width: maxWidth, height: maxHeight }]}
    >
      <View
        style={[
          styles.roundedMediaChrome,
          { width: dw, height: dh, borderRadius: cornerRadius },
        ]}
      >
        <Video
          source={{ uri }}
          style={{ width: dw, height: dh }}
          useNativeControls
          resizeMode={ResizeMode.COVER}
          isLooping
          onReadyForDisplay={(e) => {
            const { width, height } = e.naturalSize;
            if (width > 0 && height > 0) {
              setNatural({ w: width, h: height });
            }
          }}
        />
      </View>
    </View>
  );
}

function PreviewDots({ length, active }: { length: number; active: number }) {
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

  const professionalLabel = `${PROFESSION_HEADLINE_ROLE[professionCode]}:`;
  const displayDate = dateText?.trim() ? dateText : "";
  const displayService = serviceText?.trim() ? serviceText : "";
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
        accessibilityLabel="Close preview"
      >
        <Text style={[Typography.label, styles.closeLabel]}>Close</Text>
        <PreviewModalCloseX />
      </Pressable>

      <Text style={[Typography.h3, styles.visitTitle]} accessibilityRole="header">
        {visitTitle}
      </Text>

      <View style={styles.block}>
        <Text style={[Typography.label, styles.fieldLabel]}>Date:</Text>
        <Text style={[Typography.bodyMedium, styles.fieldValue]}>
          {displayDate}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={[Typography.label, styles.fieldLabel]}>Service:</Text>
        <Text style={[Typography.bodyMedium, styles.fieldValue]}>
          {displayService}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={[Typography.label, styles.fieldLabel]}>
          Service description:
        </Text>
        <Text style={[Typography.bodyMedium, styles.fieldValue]}>
          {displayComment}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={[Typography.label, styles.fieldLabel]}>Duration:</Text>
        <Text style={[Typography.bodyMedium, styles.fieldValue]}>
          {displayDuration}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={[Typography.label, styles.fieldLabel]}>Price:</Text>
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
                    />
                  ) : item.uri ? (
                    <VisitPreviewSizedVideo
                      uri={item.uri}
                      maxWidth={carouselTrackWidth}
                      maxHeight={carouselHeight}
                      cornerRadius={previewMediaRadius}
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
              accessibilityLabel="Previous image"
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
              accessibilityLabel="Next image"
            >
              <PreviewArrowRightIcon />
            </Pressable>
          </View>
        </>
      ) : null}

      <PaddedLabelButton
        title="Close preview"
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
