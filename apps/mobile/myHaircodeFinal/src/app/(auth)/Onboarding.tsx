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

type OnboardingPage = {
  title: string;
  subtitle?: string;
  image: ImageSourcePropType;
};

const ONBOARDING_HERO_IMAGE = require("@/assets/images/onboarding_image.png");

const PAGES: OnboardingPage[] = [
  {
    title: "Everything stays with you",
    image: ONBOARDING_HERO_IMAGE,
  },
  {
    title: "Inspiration",
    subtitle:
      "Share inspiration and ideas with each other ahead of appointments",
    image: ONBOARDING_HERO_IMAGE,
  },
  {
    title: "Search for professionals",
    subtitle: "Find the perfect match for your beauty needs",
    image: ONBOARDING_HERO_IMAGE,
  },
];

function OnboardingPagerControls({
  index,
  go,
  done,
  style,
}: {
  index: number;
  go: (dir: -1 | 1) => void;
  done: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
}) {
  const navSize = responsiveScale(48);
  return (
    <View style={style}>
      <View style={styles.side}>
        {index > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => go(-1)}
          >
            <LeftArrowIcon width={navSize} height={navSize} />
          </Pressable>
        )}
      </View>

      <View pointerEvents="none" style={styles.dots}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>

      <View style={[styles.side, { alignItems: "flex-end" }]}>
        {index < PAGES.length - 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => go(1)}
          >
            <RightArrowIcon width={navSize} height={navSize} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Done"
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
  const { markSeen } = useFirstLaunch();
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList>(null);
  /** Only drive index from onScroll while the user is dragging — avoids fighting scrollToIndex. */
  const userDragging = useRef(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const pageHeight = height - insets.top;

  /** Same top offset + image height for every slide (text length must not move the image). */
  const heroLayout = useMemo(() => {
    const pageH = height - insets.top;
    const tablet = getDeviceType() === "tablet";
    const landscape = width > height;

    // Breathing room below status bar (safe area handled by SafeAreaView `top` edge).
    const top = responsiveMargin(16, 22);
    let ratio = 0.62;
    if (tablet) {
      ratio = landscape ? 0.36 : 0.48;
    } else if (landscape) {
      ratio = 0.44;
    }
    let imageH = Math.round(pageH * ratio);
    const reserveForTextAndChrome = responsiveVerticalScale(26, 36);
    const maxH = Math.max(
      Math.round(pageH * 0.68 - reserveForTextAndChrome),
      Math.round(pageH * 0.4)
    );
    imageH = Math.min(imageH, maxH);

    const imageToTitle = responsiveMargin(22, 28);

    return {
      heroImageTop: top,
      heroImageHeight: Math.max(imageH, Math.round(pageH * 0.36)),
      heroTitleMarginTop: imageToTitle,
    };
  }, [width, height, insets.top]);

  const syncIndexFromOffset = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / width);
      const clamped = Math.max(0, Math.min(PAGES.length - 1, next));
      setIndex((prev) => (prev !== clamped ? clamped : prev));
    },
    [width]
  );

  const go = (dir: -1 | 1) => {
    const next = index + dir;
    if (next >= 0 && next < PAGES.length) {
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
        data={PAGES}
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
                      { marginTop: heroLayout.heroTitleMarginTop },
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={[Typography.bodyLarge, styles.heroSubtitle]}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>

              <OnboardingPagerControls
                index={index}
                go={go}
                done={done}
                style={[
                  styles.controls,
                  styles.controlsLower,
                  styles.heroControls,
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
    width: "100%",
    backgroundColor: primaryGreen,
  },
  /** Top-aligned so image top margin is identical on every slide regardless of copy length. */
  heroContent: {
    flex: 1,
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
  /** Space above/below pager; extra bottom margin lifts dots + buttons off the home indicator. */
  controlsLower: {
    marginTop: responsiveMargin(38),
    marginBottom: responsiveMargin(30),
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
    minHeight: 0,
    alignItems: "center",
    width: "100%",
    justifyContent: "flex-start",
  },
  heroTitle: {
    textAlign: "center",
  },
  heroSubtitle: {
    textAlign: "center",
    marginTop: responsiveMargin(16),
    paddingHorizontal: responsivePadding(12),
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
