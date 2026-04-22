import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import OrganicPattern from "../../../assets/images/Organic-pattern-5.svg";
import FooterLogo from "../../../assets/images/myBeautyCode_logo.svg";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
} from "@/src/constants/Colors";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { Typography } from "@/src/constants/Typography";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  isTablet,
  responsiveFontSize,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { Spacer } from "@/src/components/Spacer";
import { StatusBar } from "expo-status-bar";

const PATTERN_ASPECT = 226 / 390;
/** Footer logo viewBox 132×95 */
const LOGO_ASPECT = 73 / 110;

/** Anton 48 regular, default line metrics (no fixed line height). */
const welcomeTitleStyle = {
  fontFamily: "Anton_400Regular" as const,
  fontSize: responsiveFontSize(48),
  fontWeight: "400" as const,
  letterSpacing: 0,
  color: primaryBlack,
  textAlign: "center" as const,
};

const Setup = () => {
  const [isChecked, setIsChecked] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const checkSide = responsiveScale(18, 20);
  /** Align square center with first line of Outfit ~16 (estimated line box). */
  const lineApprox = responsiveFontSize(16) * 1.22;
  const checkboxAlignTop = Math.max(
    0,
    Math.round((lineApprox - checkSide) / 2)
  );
  const patternHeight = windowWidth * PATTERN_ASPECT;
  const footerLogoWidth = Math.min(
    responsiveScale(168, 220),
    windowWidth * 0.5
  );
  const footerLogoHeight = footerLogoWidth * LOGO_ASPECT;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.patternWrap}>
          <OrganicPattern width={windowWidth} height={patternHeight} />
        </View>

        <View style={styles.body}>
          <Spacer vertical={isTablet() ? 12 : 36} />

          <Text style={welcomeTitleStyle}>Welcome to</Text>
          <Text style={welcomeTitleStyle}>myne!</Text>

          <Spacer vertical={isTablet() ? 56 : 48} />

          <View style={styles.checkboxOuter}>
            <View style={styles.checkboxRow}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                onPress={() => setIsChecked((v) => !v)}
                hitSlop={12}
                style={[styles.checkboxHit, { marginTop: checkboxAlignTop }]}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    { width: checkSide, height: checkSide },
                    isChecked && styles.checkboxBoxChecked,
                  ]}
                >
                  {isChecked ? (
                    <MaterialIcons
                      name="check"
                      size={responsiveScale(13, 15)}
                      color={primaryWhite}
                    />
                  ) : null}
                </View>
              </Pressable>
              <View style={styles.checkboxTextCol}>
                <Text style={styles.consentText}>
                  I have read and agree to the
                </Text>
                <Text
                  accessibilityRole="link"
                  onPress={() => router.push("/(setup)/TermsAndPrivacy")}
                  style={[styles.consentText, styles.link]}
                >
                  terms and privacy
                </Text>
              </View>
            </View>
          </View>

          <Spacer vertical={isTablet() ? 48 : 46} />

          <PaddedLabelButton
            title="Set up my account"
            horizontalPadding={32}
            verticalPadding={16}
            disabled={!isChecked}
            onPress={() => router.push("./GeneralSetup")}
            style={styles.cta}
            textStyle={styles.ctaLabel}
          />

          <View style={styles.bottomSpacer} />

          <View style={styles.footer}>
            <FooterLogo
              width={footerLogoWidth}
              height={footerLogoHeight}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Setup;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: primaryGreen,
    paddingBottom: responsivePadding(24),
  },
  patternWrap: {
    marginBottom: responsiveMargin(28),
  },
  body: {
    flex: 1,
    paddingHorizontal: responsivePadding(24),
    alignItems: "center",
  },
  /** Full width so the inner row can be centered as a unit. */
  checkboxOuter: {
    width: "100%",
    alignItems: "center",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkboxHit: {
    marginRight: responsivePadding(10),
  },
  /** Square — no border radius; primary black border / fill when checked. */
  checkboxBox: {
    borderWidth: 1,
    borderColor: primaryBlack,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxBoxChecked: {
    backgroundColor: primaryBlack,
  },
  checkboxTextCol: {
    maxWidth: responsiveScale(268, 304),
    flexShrink: 1,
  },
  /** Outfit 16 light; matches mock — left-aligned next to checkbox. */
  consentText: {
    ...Typography.bodySmall,
    lineHeight: undefined,
    color: primaryBlack,
    textAlign: "left",
  },
  link: {
    textDecorationLine: "underline",
    fontFamily: Typography.label.fontFamily,
    fontWeight: "500",
    color: primaryBlack,
    marginTop: responsiveMargin(4),
    textAlign: "left",
  },
  cta: {
    alignSelf: "center",
    marginTop: 0,
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
    overflow: "hidden",
  },
  ctaLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
  bottomSpacer: {
    flexGrow: 1,
    minHeight: responsivePadding(24),
  },
  footer: {
    paddingTop: responsivePadding(24),
    alignItems: "center",
  },
});
