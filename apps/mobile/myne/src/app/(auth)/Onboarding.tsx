/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable react/react-in-jsx-scope */
import CheckIcon from "../../../assets/icons/check.svg";
import LeftArrowIcon from "../../../assets/icons/left_arrow.svg";
import RightArrowIcon from "../../../assets/icons/right_arrow.svg";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { useFirstLaunch } from "@/src/hooks/useFirstLaunch";
import {
  getDeviceType,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
  responsiveVerticalScale,
} from "@/src/utils/responsive";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useI18n } from "@/src/providers/LanguageProvider";

type OnboardingPage = {
  title: string;
  subtitle?: string;
  image: ImageSourcePropType;
};

const ONBOARDING_HERO_IMAGE = require("@/assets/images/onboarding_image.png");

function OnboardingPagerControls({
  index,
  pageCount,
  go,
  done,
  style,
  previousLabel,
  nextLabel,
  doneLabel,
}: {
  index: number;
  pageCount: number;
  go: (dir: -1 | 1) => void;
  done: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
  previousLabel: string;
  nextLabel: string;
  doneLabel: string;
}) {
  const navSize = responsiveScale(48);
  return (
    <View style={style}>
      <View style={styles.side}>
        {index > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={previousLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => go(-1)}
          >
            <LeftArrowIcon width={navSize} height={navSize} />
          </Pressable>
        )}
      </View>

      <View pointerEvents="none" style={styles.dots}>
        {Array.from({ length: pageCount }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>

      <View style={[styles.side, { alignItems: "flex-end" }]}>
        {index < pageCount - 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => go(1)}
          >
            <RightArrowIcon width={navSize} height={navSize} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={doneLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={done}
          >
            <CheckIcon width={navSize} height={navSize} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function Onboarding() {
  const { t } = useI18n();
  const { markSeen } = useFirstLaunch();
  const pages = useMemo<OnboardingPage[]>(
    () => [
      {
        title: t("onboarding.page1Title"),
        subtitle: t("onboarding.page1Subtitle"),
        image: ONBOARDING_HERO_IMAGE,
      },
      {
        title: t("onboarding.page2Title"),
        subtitle: t("onboarding.page2Subtitle"),
        image: ONBOARDING_HERO_IMAGE,
      },
      {
        title: t("onboarding.page3Title"),
        subtitle: t("onboarding.page3Subtitle"),
        image: ONBOARDING_HERO_IMAGE,
      },
    ],
    [t]
  );
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList>(null);
  /** Only drive index from onScroll while the user is dragging — avoids fighting scrollToIndex. */
  const userDragging = useRef(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const pageHeight = height - insets.top;
  const bottomChrome = insets.bottom + responsiveMargin(16, 20);

  /** Same top offset + image height for every slide (text length must not move the image). */
  const heroLayout = useMemo(() => {
    const pageH = height - insets.top;
    const tablet = getDeviceType() === "tablet";
    const landscape = width > height;
    const compact = pageH < 740 || width < 360;

    const top = responsiveMargin(16, 22);
    let ratio = compact ? 0.46 : 0.58;
    if (tablet) {
      ratio = landscape ? 0.36 : 0.44;
    } else if (landscape) {
      ratio = 0.4;
    }
    let imageH = Math.round(pageH * ratio);
    const reserveForTextAndChrome = responsiveVerticalScale(compact ? 34 : 26, 36);
    const maxH = Math.max(
      Math.round(pageH * (compact ? 0.52 : 0.62) - reserveForTextAndChrome),
      Math.round(pageH * 0.32)
    );
    imageH = Math.min(imageH, maxH);

    const imageToTitle = responsiveMargin(compact ? 14 : 22, 28);

    return {
      heroImageTop: top,
      heroImageHeight: Math.max(imageH, Math.round(pageH * 0.28)),
      heroTitleMarginTop: imageToTitle,
      compact,
    };
  }, [width, height, insets.top]);

  const syncIndexFromOffset = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / width);
      const clamped = Math.max(0, Math.min(pages.length - 1, next));
      setIndex((prev) => (prev !== clamped ? clamped : prev));
    },
    [width, pages.length]
  );

  const go = (dir: -1 | 1) => {
    const next = index + dir;
    if (next >= 0 && next < pages.length) {
      setIndex(next);
      ref.current?.scrollToIndex({ index: next, animated: true });
    }
  };

  const done = async () => {
    await markSeen();
    router.replace("/Splash");
  };

  const onScrollWhileDragging = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!userDragging.current) {
        return;
      }
      syncIndexFromOffset(e);
    },
    [syncIndexFromOffset]
  );

  const onScrollBeginDrag = useCallback(() => {
    userDragging.current = true;
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      userDragging.current = false;
      syncIndexFromOffset(e);
    },
    [syncIndexFromOffset]
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: primaryGreen }}
    >
      <StatusBar style="dark" />
      <FlatList
        ref={ref}
        data={pages}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        snapToInterval={width}
        decelerationRate="fast"
        bounces={false}
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        scrollEventThrottle={16}
        onScroll={onScrollWhileDragging}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <View style={[styles.card, { width, height: pageHeight }]}>
            <View style={styles.heroCard}>
              <View style={styles.heroContent}>
                <View
                  style={[
                    styles.heroImageOuter,
                    { marginTop: heroLayout.heroImageTop },
                  ]}
                >
                  <View
                    style={[
                      styles.heroImageClip,
                      { height: heroLayout.heroImageHeight },
                    ]}
                  >
                    <Image
                      source={item.image}
                      style={styles.heroImageFill}
                      resizeMode="cover"
                    />
                  </View>
                </View>
                <View style={styles.textContainer}>
                  <Text
                    style={[
                      Typography.h2,
                      styles.heroTitle,
                      heroLayout.compact && styles.heroTitleCompact,
                      { marginTop: heroLayout.heroTitleMarginTop },
                    ]}
                    maxFontSizeMultiplier={1.15}
                  >
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text
                      style={[
                        Typography.bodyLarge,
                        styles.heroSubtitle,
                        heroLayout.compact && styles.heroSubtitleCompact,
                      ]}
                      maxFontSizeMultiplier={1.15}
                    >
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>

              <OnboardingPagerControls
                index={index}
                pageCount={pages.length}
                go={go}
                done={done}
                previousLabel={t("onboarding.previousA11y")}
                nextLabel={t("onboarding.nextA11y")}
                doneLabel={t("onboarding.doneA11y")}
                style={[
                  styles.controls,
                  styles.controlsLower,
                  styles.heroControls,
                  {
                    marginTop: heroLayout.compact
                      ? responsiveMargin(16)
                      : responsiveMargin(38),
                    paddingBottom: bottomChrome,
                  },
                ]}
              />
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: primaryGreen,
  },
  heroCard: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    backgroundColor: primaryGreen,
  },
  /** Top-aligned so image top margin is identical on every slide regardless of copy length. */
  heroContent: {
    flex: 1,
    minHeight: 0,
    justifyContent: "flex-start",
    paddingHorizontal: responsivePadding(16),
    paddingBottom: 0,
  },
  heroImageOuter: {
    width: "100%",
    paddingHorizontal: responsivePadding(4),
  },
  heroControls: {
    marginVertical: 0,
  },
  /** Space above pager; bottom padding is applied per-device via safe-area insets. */
  controlsLower: {
    marginTop: responsiveMargin(38),
    marginBottom: 0,
  },
  heroImageClip: {
    width: "100%",
    borderRadius: responsiveScale(21.87),
    overflow: "hidden",
  },
  heroImageFill: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
    alignItems: "center",
    width: "100%",
    justifyContent: "flex-start",
  },
  heroTitle: {
    textAlign: "center",
    flexShrink: 1,
  },
  heroTitleCompact: {
    fontSize: responsiveScale(36),
    lineHeight: responsiveScale(40),
  },
  heroSubtitle: {
    textAlign: "center",
    marginTop: responsiveMargin(16),
    paddingHorizontal: responsivePadding(12),
    flexShrink: 1,
  },
  heroSubtitleCompact: {
    marginTop: responsiveMargin(10),
    fontSize: responsiveScale(17),
    lineHeight: responsiveScale(22),
  },
  controls: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: responsivePadding(16),
  },
  side: { width: responsiveScale(60) },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: responsiveScale(8),
  },
  dot: {
    width: responsiveScale(8),
    height: responsiveScale(8),
    borderRadius: responsiveScale(4),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: "transparent",
  },
  dotActive: {
    backgroundColor: primaryBlack,
    borderColor: primaryBlack,
  },
});
