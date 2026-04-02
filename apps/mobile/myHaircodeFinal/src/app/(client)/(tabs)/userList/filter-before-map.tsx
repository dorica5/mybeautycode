import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CaretLeft } from "phosphor-react-native";
import { StatusBar } from "expo-status-bar";
import OrganicPattern from "../../../../../assets/images/Organic-pattern-5.svg";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import {
  responsiveScale,
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
} from "@/src/utils/responsive";

/** `Organic-pattern-5.svg` viewBox — preserve aspect ratio so the spiral matches design. */
const ORGANIC_LOGO_VIEWBOX_W = 390;
const ORGANIC_LOGO_VIEWBOX_H = 226;

type Profession = "hair" | "nails" | "brows";

const OPTIONS: { key: Profession; label: string }[] = [
  { key: "hair", label: "Hair" },
  { key: "nails", label: "Nails" },
  { key: "brows", label: "Brows" },
];

function parsePreset(p: string | undefined): Profession | undefined {
  if (p === "hair" || p === "nails" || p === "brows") return p;
  return undefined;
}

const FilterBeforeMapScreen = () => {
  const { preset } = useLocalSearchParams<{ preset?: string }>();
  const initial = useMemo(() => parsePreset(preset), [preset]);
  const [selected, setSelected] = useState<Profession | undefined>(initial);

  const onNext = useCallback(() => {
    if (!selected) return;
    router.push({
      pathname: "/(client)/(tabs)/userList/map",
      params: { profession: selected },
    });
  }, [selected]);

  const spiralWidth = responsiveScale(200);
  const spiralHeight =
    spiralWidth * (ORGANIC_LOGO_VIEWBOX_H / ORGANIC_LOGO_VIEWBOX_W);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <Pressable
        onPress={() => router.back()}
        style={styles.backRow}
        accessibilityRole="button"
        accessibilityLabel="Tilbake"
      >
        <CaretLeft size={responsiveScale(24)} color={primaryBlack} />
        <Text style={styles.backLabel}>Tilbake</Text>
      </Pressable>

      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <OrganicPattern width={spiralWidth} height={spiralHeight} />
        </View>

        <Text style={[Typography.h3, styles.heading]}>Find professionals</Text>
        <Text style={[Typography.agLabel16, styles.sub]}>
          What kind of professional?
        </Text>

        <View style={styles.options}>
          {OPTIONS.map(({ key, label }) => {
            const on = selected === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSelected(key)}
                style={[styles.option, on && styles.optionSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={styles.optionLabel}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={onNext}
          disabled={!selected}
          style={[styles.nextBtn, !selected && styles.nextBtnDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !selected }}
        >
          <Text style={styles.nextLabel}>Next</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default FilterBeforeMapScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsivePadding(8),
    paddingVertical: responsivePadding(8),
    alignSelf: "flex-start",
  },
  backLabel: {
    ...Typography.bodyMedium,
    marginLeft: responsivePadding(4),
  },
  content: {
    flex: 1,
    paddingHorizontal: responsivePadding(20),
    alignItems: "center",
  },
  logoWrap: {
    marginTop: responsiveMargin(4),
    marginBottom: responsiveMargin(16),
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
    width: responsiveScale(342),
    alignSelf: "center",
    gap: responsiveScale(8),
  },
  option: {
    width: responsiveScale(342),
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
    backgroundColor: primaryWhite,
    borderWidth: 2,
  },
  optionLabel: {
    ...Typography.agBodyRegular18,
    textAlign: "center",
  },
  nextBtn: {
    marginTop: responsiveScale(46),
    marginBottom: responsiveMargin(24),
    alignSelf: "center",
    width: responsiveScale(98),
    height: responsiveScale(52),
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: responsiveScale(26),
    backgroundColor: primaryBlack,
    justifyContent: "center",
    alignItems: "center",
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextLabel: {
    fontFamily: "Outfit_300Light",
    fontSize: responsiveFontSize(16, 16),
    fontWeight: "400",
    letterSpacing: 0,
    color: primaryWhite,
    textAlign: "center",
  },
});
