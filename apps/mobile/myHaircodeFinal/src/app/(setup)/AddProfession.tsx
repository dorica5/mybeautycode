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
  professionOptionsNotYetLinked,
  type ProfessionChoiceCode,
} from "@/src/constants/professionCodes";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { CaretLeft } from "phosphor-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/providers/AuthProvider";

/**
 * Same layout as Choose Profession, for adding a profession you do not already have.
 * Used from “Add account” (switch account) and “Become a professional” (client profile).
 */
const AddProfession = () => {
  const { profile, loading } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<ProfessionChoiceCode | null>(null);

  const patternWidth = windowWidth;
  const heroHeight = patternWidth / 1.77;
  const heroPatternVerticalNudge = heroHeight * 0.34;

  const options = useMemo(
    () => professionOptionsNotYetLinked(profile?.profession_codes),
    [profile?.profession_codes],
  );

  useEffect(() => {
    if (
      selected &&
      !options.some((o) => o.code === selected)
    ) {
      setSelected(null);
    }
  }, [options, selected]);

  const goNext = () => {
    if (!selected) return;
    router.push({
      pathname: "/(setup)/ProfessionalSetup",
      params: { profession_code: selected },
    });
  };

  if (loading || !profile) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]} edges={["top"]}>
        <StatusBar style="dark" />
        <ActivityIndicator color={primaryBlack} />
      </SafeAreaView>
    );
  }

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
            accessibilityLabel="Back"
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
            Choose what kind
          </Text>

          <Text style={styles.description}>
            You can have an account both as a client and as a professional. You
            can add accounts later.
          </Text>

          {options.length === 0 ? (
            <Text style={styles.emptyMessage}>
              You already have every profession type on your account.
            </Text>
          ) : (
            <View style={styles.cards}>
              {options.map((opt) => {
                const isSel = selected === opt.code;
                return (
                  <Pressable
                    key={opt.code}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSel }}
                    onPress={() => setSelected(opt.code)}
                    style={[styles.card, isSel && styles.cardSelected]}
                  >
                    <Text style={[Typography.bodyLarge, styles.cardLabel]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <PaddedLabelButton
            title="Next"
            horizontalPadding={32}
            verticalPadding={16}
            disabled={!selected || options.length === 0}
            onPress={goNext}
            style={styles.nextButton}
            textStyle={styles.nextButtonLabel}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddProfession;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: responsiveMargin(14),
  },
  description: {
    ...Typography.bodyMedium,
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(22),
  },
  emptyMessage: {
    ...Typography.bodyMedium,
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(28),
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
