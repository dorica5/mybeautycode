/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable react/react-in-jsx-scope */
import CheckIcon from "../../../assets/icons/check.svg";
import LeftArrowIcon from "../../../assets/icons/left_arrow.svg";
import RightArrowIcon from "../../../assets/icons/right_arrow.svg";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import { Typography, FONT_FAMILY } from "@/src/constants/Typography";
import { useAuth } from "@/src/providers/AuthProvider";
import {
  getBreakpoint,
  responsiveFontSize,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
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
  titleLine1: string;
  titleLine2: string;
  subtitle?: string;
  image: ImageSourcePropType;
};

const ONBOARDING_HERO_IMAGE = require("@/assets/images/onboarding_image.png");

/** Anton is wide ? conservative width estimate so both title lines share one size. */
function fitTitleFontSize(text: string, innerWidth: number): number {
  const trimmed = text.trim();
  if (!trimmed || innerWidth <= 0) return 0;
  return Math.floor(innerWidth / (trimmed.length * 0.58));
}

function titleSizeForPage(
  line1: string,
  line2: string,
  innerWidth: number,
  compact: boolean
): number {
  const maxSize = responsiveFontSize(compact ? 40 : 44);
  const minSize = responsiveFontSize(compact ? 28 : 32);
  const fit = Math.min(
    fitTitleFontSize(line1, innerWidth),
    fitTitleFontSize(line2, innerWidth)
  );
  return Math.min(maxSize, Math.max(minSize, fit));
}

/** One Anton heading row ? same font size as its pair; never shrinks independently. */
function OnboardingTitleLine({
  text,
  fontSize,
  lineHeight,
}: {
  text: string;
  fontSize: number;
  lineHeight: number;
}) {
  return (
    <Text
      numberOfLines={1}
      maxFontSizeMultiplier={1}
      allowFontScaling={false}
      style={[
        styles.heroTitleLine,
        {
          fontFamily: FONT_FAMILY.anton,
          fontSize,
          lineHeight,
          paddingTop: Math.max(8, Math.round(fontSize * 0.22)),
          color: primaryBlack,
        },
      ]}
    >
      {text}
    </Text>
  );
}

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
        {index > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={previousLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => go(-1)}
          >
            <LeftArrowIcon width={navSize} height={navSize} />
          </Pressable>
        ) : null}
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
  const { markOnboardingSeen } = useAuth();
  const pages = useMemo<OnboardingPage[]>(
    () => [
      {
        titleLine1: t("onboarding.page1TitleLine1"),
        titleLine2: t("onboarding.page1TitleLine2"),
        subtitle: t("onboarding.page1Subtitle"),
        image: ONBOARDING_HERO_IMAGE,
      },
      {
        titleLine1: t("onboarding.page2TitleLine1"),
        titleLine2: t("onboarding.page2TitleLine2"),
        subtitle: t("onboarding.page2Subtitle"),
        image: ONBOARDING_HERO_IMAGE,
      },
      {
        titleLine1: t("onboarding.page3TitleLine1"),
        titleLine2: t("onboarding.page3TitleLine2"),
        subtitle: t("onboarding.page3Subtitle"),
        image: ONBOARDING_HERO_IMAGE,
      },
    ],
    [t]
  );
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList>(null);
  const userDragging = useRef(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const pageHeight = height - insets.top - insets.bottom;

  /** Match Figma/reference: tall hero image, two single-line title rows, dots + nav at bottom. */
  const layout = useMemo(() => {
    const pageH = height - insets.top - insets.bottom;
    const compact = getBreakpoint() === "xxs" || pageH < 700;

    const shellPad = responsivePadding(20);
    const innerW = width - shellPad * 2;

    const imageTop = responsiveMargin(compact ? 8 : 14, 18);
    const titleGap = responsiveMargin(compact ? 18 : 24, 28);
    const subtitleGap = responsiveMargin(compact ? 12 : 16);

    const controlsBlock =
      responsiveScale(48) +
      responsiveMargin(compact ? 20 : 28) +
      responsiveMargin(compact ? 8 : 12);

    const textBlock = responsiveMargin(compact ? 108 : 128);
    const targetRatio = compact ? 0.5 : 0.56;
    const maxImageH = pageH - imageTop - titleGap - textBlock - controlsBlock;
    const imageH = Math.max(
      Math.round(pageH * (compact ? 0.4 : 0.46)),
      Math.min(Math.round(pageH * targetRatio), maxImageH)
    );

    const titleSizes = pages.map((page) =>
      titleSizeForPage(page.titleLine1, page.titleLine2, innerW, compact)
    );
    const titleLineHeight = (size: number) => Math.round(size * 1.1);

    return {
      shellPad,
      imageTop,
      imageH,
      titleGap,
      subtitleGap,
      titleSizes,
      titleLineHeight,
      controlsPadTop: responsiveMargin(compact ? 16 : 24),
      controlsPadBottom: responsiveMargin(compact ? 8 : 12),
    };
  }, [width, height, insets.top, insets.bottom, pages]);

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
    await markOnboardingSeen();
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
      edges={["top", "left", "right", "bottom"]}
      style={styles.safe}
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
        style={styles.pager}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        scrollEventThrottle={16}
        onScroll={onScrollWhileDragging}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item, index: pageIndex }) => (
          <View style={[styles.card, { width, height: pageHeight }]}>
            <View
              style={[styles.pageShell, { paddingHorizontal: layout.shellPad }]}
            >
              <View
                style={[
                  styles.heroImageClip,
                  {
                    marginTop: layout.imageTop,
                    height: layout.imageH,
                  },
                ]}
              >
                <Image
                  source={item.image}
                  style={styles.heroImageFill}
                  resizeMode="cover"
                />
              </View>

              <View
                style={[
                  styles.heroTitleBlock,
                  { marginTop: layout.titleGap },
                ]}
              >
                <OnboardingTitleLine
                  text={item.titleLine1}
                  fontSize={layout.titleSizes[pageIndex]}
                  lineHeight={layout.titleLineHeight(layout.titleSizes[pageIndex])}
                />
                <OnboardingTitleLine
                  text={item.titleLine2}
                  fontSize={layout.titleSizes[pageIndex]}
                  lineHeight={layout.titleLineHeight(layout.titleSizes[pageIndex])}
                />
              </View>

              {item.subtitle ? (
                <Text
                  style={[
                    Typography.bodyLarge,
                    styles.heroSubtitle,
                    { marginTop: layout.subtitleGap },
                  ]}
                >
                  {item.subtitle}
                </Text>
              ) : null}
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
                {
                  paddingTop: layout.controlsPadTop,
                  paddingBottom: layout.controlsPadBottom,
                  paddingHorizontal: layout.shellPad,
                },
              ]}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  pager: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  card: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  pageShell: {
    flex: 1,
    width: "100%",
  },
  heroImageClip: {
    width: "100%",
    borderRadius: responsiveScale(21.87),
    overflow: "hidden",
    alignSelf: "center",
  },
  heroImageFill: {
    width: "100%",
    height: "100%",
  },
  heroTitleBlock: {
    width: "100%",
    alignItems: "center",
  },
  heroTitleLine: {
    textAlign: "center",
    width: "100%",
  },
  heroSubtitle: {
    textAlign: "center",
    width: "100%",
    paddingHorizontal: responsivePadding(4),
  },
  controls: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    backgroundColor: primaryGreen,
  },
  side: {
    width: responsiveScale(60),
    minHeight: responsiveScale(48),
    justifyContent: "center",
  },
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
