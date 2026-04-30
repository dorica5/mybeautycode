import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import {
  NavBackRow,
  navBackChromeStyles,
  navBackPlaceholderStyle,
} from "@/src/components/NavBackRow";
import { StatusBar } from "expo-status-bar";
import OrganicPattern from "../../../../../assets/images/Organic-pattern-5.svg";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
  contentCardMaxWidth,
  isTablet,
} from "@/src/utils/responsive";

type Profession = "hair" | "nails" | "brows";

const OPTIONS: { key: Profession; label: string }[] = [
  { key: "hair", label: "Hair" },
  { key: "nails", label: "Nails" },
  { key: "brows", label: "Brows" },
];

/** Delay between the tile turning black (selected) and pushing the next screen. */
const SELECTION_FEEDBACK_MS = 180;

const FilterBeforeMapScreen = () => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { fromTab } = useLocalSearchParams<{ fromTab?: string }>();
  const hideBack = fromTab === "1";
  const isFocused = useIsFocused();

  const patternWidth = windowWidth;
  const heroHeight = patternWidth / 1.77;
  const heroPatternVerticalNudge = heroHeight * 0.34;

  const optionTileWidth = useMemo(() => {
    const shortSide = Math.min(windowWidth, windowHeight);
    const phoneW = responsiveScale(342);
    if (!isTablet()) return phoneW;
    return Math.min(
      contentCardMaxWidth(shortSide),
      windowWidth - responsivePadding(20) * 2
    );
  }, [windowWidth, windowHeight]);

  const [selected, setSelected] = useState<Profession | undefined>(undefined);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset any pending selection when the screen regains focus (e.g. after
  // coming back from the list): otherwise the previously picked tile stays
  // highlighted.
  useEffect(() => {
    if (isFocused) {
      setSelected(undefined);
    }
  }, [isFocused]);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
    };
  }, []);

  const onPickProfession = useCallback((key: Profession) => {
    // Ignore repeat taps while the hand-off animation is running.
    if (navTimerRef.current) return;
    setSelected(key);
    navTimerRef.current = setTimeout(() => {
      navTimerRef.current = null;
      router.push({
        pathname: "/(client)/(tabs)/userList",
        params: { profession: key },
      });
    }, SELECTION_FEEDBACK_MS);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!hideBack ? (
          <View style={navBackChromeStyles.screenBar}>
            <NavBackRow onPress={() => router.back()} />
          </View>
        ) : (
          <View style={[navBackChromeStyles.screenBar, navBackPlaceholderStyle()]} />
        )}

        <View
          style={[
            styles.heroBleed,
            {
              width: patternWidth,
              marginLeft: -insets.left,
              marginRight: -insets.right,
              height: heroHeight,
            },
          ]}
        >
          <View style={[styles.hero, { height: heroHeight }]}>
            <OrganicPattern
              width={patternWidth}
              height={heroHeight}
              preserveAspectRatio="xMidYMid slice"
              style={{
                transform: [{ translateY: -heroPatternVerticalNudge }],
              }}
            />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[Typography.h3, styles.heading]}>Find professionals</Text>
          <Text style={[Typography.agLabel16, styles.sub]}>
            What kind of professional?
          </Text>

          <View style={[styles.options, { width: optionTileWidth }]}>
            {OPTIONS.map(({ key, label }) => {
              const on = selected === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => onPickProfession(key)}
                  style={[
                    styles.option,
                    { width: optionTileWidth },
                    on && styles.optionSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: on }}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      on && styles.optionLabelSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FilterBeforeMapScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: responsiveMargin(24),
  },
  heroBleed: {
    marginTop: responsiveMargin(8),
    marginBottom: responsiveMargin(-30),
    overflow: "hidden",
  },
  hero: {
    backgroundColor: primaryGreen,
    overflow: "hidden",
    width: "100%",
  },
  content: {
    flex: 1,
    paddingHorizontal: responsivePadding(20),
    alignItems: "center",
  },
  heading: {
    textAlign: "center",
    marginBottom: responsiveScale(46),
  },
  sub: {
    alignSelf: "stretch",
    textAlign: "left",
    marginBottom: responsiveMargin(20),
  },
  options: {
    alignSelf: "center",
    gap: responsiveScale(8),
  },
  option: {
    height: responsiveScale(59),
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: responsiveScale(18),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  optionSelected: {
    backgroundColor: primaryBlack,
    borderColor: primaryBlack,
    borderWidth: 1,
  },
  optionLabel: {
    ...Typography.agBodyRegular18,
    textAlign: "center",
    color: primaryBlack,
  },
  optionLabelSelected: {
    color: primaryWhite,
  },
});
