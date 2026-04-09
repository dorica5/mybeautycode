import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  useWindowDimensions,
} from "react-native";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  PROFESSION_HEADLINE_ROLE,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import {
  PreviewArrowLeftIcon,
  PreviewArrowRightIcon,
  PreviewDots,
  VisitPreviewSizedImage,
  VisitPreviewSizedVideo,
} from "@/src/components/visits/VisitPreviewModalContent";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

export type VisitRecordDetailMedia = { uri: string; type: string };

export type VisitRecordDetailViewProps = {
  dateText: string;
  serviceText: string;
  commentText: string;
  /** Professionals (any); hidden for clients. */
  showDurationRow: boolean;
  /** Only the professional who created the visit. */
  showPriceRow: boolean;
  durationText: string;
  priceText: string;
  professionCode: ProfessionChoiceCode;
  professional: {
    full_name: string;
    salon_name?: string;
    avatar_url?: string | null;
  };
  mediaSlides: VisitRecordDetailMedia[];
  carouselHeight: number;
  /** When set, the professional card is tappable (e.g. client opens their profile). */
  onPressProfessional?: () => void;
  professionalDisabled?: boolean;
};

/**
 * Sage-screen visit body matching {@link VisitPreviewModalContent} (without modal chrome).
 */
export function VisitRecordDetailView({
  dateText,
  serviceText,
  commentText,
  showDurationRow,
  showPriceRow,
  durationText,
  priceText,
  professionCode,
  professional,
  mediaSlides,
  carouselHeight,
  onPressProfessional,
  professionalDisabled = false,
}: VisitRecordDetailViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const carouselTrackWidth = Math.max(
    1,
    Math.round(windowWidth - 2 * responsivePadding(20))
  );
  const previewScrollRef = useRef<ScrollView>(null);
  const hasMedia = mediaSlides.length > 0;
  const slideCount = mediaSlides.length;
  const [activeSlide, setActiveSlide] = useState(0);

  const professionalLabel = `${PROFESSION_HEADLINE_ROLE[professionCode]}:`;
  const displayDate = dateText?.trim() ? dateText : "";
  const displayService = serviceText?.trim() ? serviceText : "";
  const displayComment = commentText?.trim() ? commentText : "";
  const displayDuration = durationText?.trim() ? durationText : "";
  const displayPrice = priceText?.trim() ? priceText : "";
  const previewMediaRadius = responsiveScale(20);

  useEffect(() => {
    setActiveSlide(0);
    previewScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [hasMedia, slideCount, mediaSlides.length]);

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

  const showDurationBlock = showDurationRow && Boolean(displayDuration);
  const showPriceBlock = showPriceRow && Boolean(displayPrice);

  return (
    <View style={styles.root}>
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

      {showDurationBlock ? (
        <View style={styles.block}>
          <Text style={[Typography.label, styles.fieldLabel]}>Duration:</Text>
          <Text style={[Typography.bodyMedium, styles.fieldValue]}>
            {displayDuration}
          </Text>
        </View>
      ) : null}

      {showPriceBlock ? (
        <View style={styles.block}>
          <Text style={[Typography.label, styles.fieldLabel]}>Price:</Text>
          <Text style={[Typography.bodyMedium, styles.fieldValue]}>
            {displayPrice}
          </Text>
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={[Typography.label, styles.fieldLabel]}>
          {professionalLabel}
        </Text>
        {onPressProfessional ? (
          <Pressable
            onPress={onPressProfessional}
            disabled={professionalDisabled}
            style={({ pressed }) => [
              pressed && !professionalDisabled && styles.proCardPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open professional profile"
          >
            <View style={styles.proCard}>
              <AvatarWithSpinner
                uri={professional.avatar_url}
                size={responsiveScale(48)}
                style={[
                  styles.proAvatar,
                  !professional.avatar_url && styles.proAvatarFallback,
                ]}
              />
              <View style={styles.proTextCol}>
                <Text style={[Typography.bodyMedium, styles.fieldValue]}>
                  {professional.full_name?.trim() ?? ""}
                </Text>
                {professional.salon_name?.trim() ? (
                  <Text style={[Typography.bodyMedium, styles.fieldValue]}>
                    {professional.salon_name}
                  </Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={styles.proCard}>
            <AvatarWithSpinner
              uri={professional.avatar_url}
              size={responsiveScale(48)}
              style={[
                styles.proAvatar,
                !professional.avatar_url && styles.proAvatarFallback,
              ]}
            />
            <View style={styles.proTextCol}>
              <Text style={[Typography.bodyMedium, styles.fieldValue]}>
                {professional.full_name?.trim() ?? ""}
              </Text>
              {professional.salon_name?.trim() ? (
                <Text style={[Typography.bodyMedium, styles.fieldValue]}>
                  {professional.salon_name}
                </Text>
              ) : null}
            </View>
          </View>
        )}
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
  proCardPressed: {
    opacity: 0.92,
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
});
