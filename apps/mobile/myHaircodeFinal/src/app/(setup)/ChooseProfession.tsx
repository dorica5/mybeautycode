import OrganicPattern from "../../../assets/images/Organic-pattern-5.svg";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
  secondaryGreen,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { CaretLeft } from "phosphor-react-native";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CHOOSE_PROFESSION_OPTIONS,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";

export type { ProfessionChoiceCode };

const ChooseProfession = () => {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<ProfessionChoiceCode | null>(null);
  /** Full device width so the pattern spans edge-to-edge under status bar. */
  const patternWidth = windowWidth;
  const heroHeight = patternWidth / 1.77;
  /** Nudge visible slice downward (move graphic up inside clip) so framing sits lower in the artwork. */
  const heroPatternVerticalNudge = heroHeight * 0.34;

  const goNext = () => {
    if (!selected) return;
    router.push({
      pathname: "/(setup)/ProfessionalSetup",
      params: { profession_code: selected },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.paddedHorizontal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backRow}
            hitSlop={12}
          >
            <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
            <Text style={[Typography.bodyMedium, styles.backText]}>Back</Text>
          </Pressable>
        </View>

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

        <View style={styles.paddedHorizontal}>
          <Text style={[Typography.h3, styles.title]} accessibilityRole="header">
            Choose profession
          </Text>

          <View style={styles.cards}>
            {CHOOSE_PROFESSION_OPTIONS.map((opt) => {
              const isSel = selected === opt.code;
              return (
                <Pressable
                  key={opt.code}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                  onPress={() => setSelected(opt.code)}
                  style={[
                    styles.card,
                    isSel && styles.cardSelected,
                  ]}
                >
                  <Text
                    style={[Typography.bodyLarge, styles.cardLabel]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <PaddedLabelButton
            title="Next"
            horizontalPadding={32}
            verticalPadding={16}
            disabled={!selected}
            onPress={goNext}
            style={styles.nextButton}
            textStyle={styles.nextButtonLabel}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChooseProfession;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: responsiveMargin(32),
  },
  paddedHorizontal: {
    paddingHorizontal: responsivePadding(24),
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: responsiveMargin(8),
    gap: responsiveMargin(4),
    alignSelf: "flex-start",
  },
  backText: {
    color: primaryBlack,
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
  title: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(22),
  },
  cards: {
    gap: responsiveMargin(14),
    marginBottom: responsiveMargin(28),
  },
  card: {
    backgroundColor: primaryWhite,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    borderRadius: responsiveScale(18),
    paddingVertical: responsivePadding(18, 14),
    paddingHorizontal: responsivePadding(20, 16),
    alignItems: "center",
  },
  cardSelected: {
    backgroundColor: secondaryGreen,
  },
  cardLabel: {
    color: primaryBlack,
    textAlign: "center",
  },
  nextButton: {
    alignSelf: "center",
    marginTop: "auto",
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
  nextButtonLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
});
