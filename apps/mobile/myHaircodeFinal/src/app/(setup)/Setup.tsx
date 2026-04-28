import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
  getBreakpoint,
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

const Setup = () => {
  const [isChecked, setIsChecked] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const layout = useMemo(() => {
    const tablet = isTablet();
    const landscape = windowWidth > windowHeight;
    const horizontalPad = responsivePadding(24, tablet ? 40 : 24);
    const bp = getBreakpoint();

    /** Centered readable column on iPad/large phones; phones stay edge-to-edge pattern. */
    const maxContentW = tablet
      ? Math.min(
          windowWidth - horizontalPad * 2,
          bp === "xl" ? 660 : bp === "lg" ? 600 : landscape ? 580 : 540
        )
      : windowWidth;

    /** Hero stays full window width; natural height follows aspect ratio. Tablets clip vertically so footer fits without scrolling. */
    const patternWidth = windowWidth;
    const patternNaturalHeight = patternWidth * PATTERN_ASPECT;
    const tabletPatternHeightCap = landscape ? 0.24 : 0.2;
    const patternMaxHeight = tablet
      ? Math.min(patternNaturalHeight, windowHeight * tabletPatternHeightCap)
      : undefined;

    const titleFont = responsiveFontSize(42, 50);
    const bodyConsentSize = responsiveFontSize(15, 17);
    const checkSide = responsiveScale(18, 22);

    /** Align checkbox with cap-height of first consent line */
    const lineApprox = bodyConsentSize * 1.25;
    const checkboxAlignTop = Math.max(
      0,
      Math.round((lineApprox - checkSide) / 2)
    );

    const footerLogoWidth = Math.min(
      responsiveScale(168, 220),
      (tablet ? maxContentW : windowWidth) * 0.5
    );

    return {
      tablet,
      landscape,
      maxContentW,
      patternWidth,
      patternNaturalHeight,
      patternMaxHeight,
      titleFont,
      bodyConsentSize,
      checkSide,
      checkboxAlignTop,
      footerLogoWidth,
      footerLogoHeight: footerLogoWidth * LOGO_ASPECT,
      horizontalPad,
      patternSectionMarginBottom: tablet ? responsiveMargin(14) : responsiveMargin(28),
    };
  }, [windowWidth, windowHeight]);

  const welcomeTitleStyle = useMemo(
    () => ({
      fontFamily: "Anton_400Regular" as const,
      fontSize: layout.titleFont,
      fontWeight: "400" as const,
      letterSpacing: 0,
      color: primaryBlack,
      textAlign: "center" as const,
    }),
    [layout.titleFont]
  );

  const consentStyle = useMemo(
    () => ({
      ...Typography.bodySmall,
      fontSize: layout.bodyConsentSize,
      lineHeight: Math.round(layout.bodyConsentSize * 1.38),
      color: primaryBlack,
      textAlign: "left" as const,
    }),
    [layout.bodyConsentSize]
  );

  const checkIconSize = responsiveScale(13, 16);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, responsivePadding(20)) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.patternSectionBase,
            { marginBottom: layout.patternSectionMarginBottom },
            layout.patternMaxHeight != null && {
              maxHeight: layout.patternMaxHeight,
              overflow: "hidden",
            },
          ]}
        >
          <OrganicPattern
            width={layout.patternWidth}
            height={layout.patternNaturalHeight}
          />
        </View>

        <View
          style={[
            styles.bodyColumn,
            { maxWidth: layout.maxContentW, alignSelf: "center" },
          ]}
        >
          <View style={[styles.body, { paddingHorizontal: layout.horizontalPad }]}>
            <Spacer vertical={layout.tablet ? 12 : 36} />

            <Text style={welcomeTitleStyle}>Welcome to</Text>
            <Text style={welcomeTitleStyle}>myne!</Text>

            <Spacer vertical={layout.tablet ? 36 : 48} />

            <View style={styles.checkboxOuter}>
              <View
                style={[
                  styles.checkboxRow,
                  layout.tablet && { width: "100%", maxWidth: 420, alignSelf: "center" },
                ]}
              >
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                  onPress={() => setIsChecked((v) => !v)}
                  hitSlop={12}
                  style={[styles.checkboxHit, { marginTop: layout.checkboxAlignTop }]}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      { width: layout.checkSide, height: layout.checkSide },
                      isChecked && styles.checkboxBoxChecked,
                    ]}
                  >
                    {isChecked ? (
                      <MaterialIcons
                        name="check"
                        size={checkIconSize}
                        color={primaryWhite}
                      />
                    ) : null}
                  </View>
                </Pressable>
                <View style={styles.checkboxTextCol}>
                  <Text style={consentStyle}>I have read and agree to the</Text>
                  <Text
                    accessibilityRole="link"
                    onPress={() => router.push("/(setup)/TermsAndPrivacy")}
                    style={[consentStyle, styles.link]}
                  >
                    terms and privacy
                  </Text>
                </View>
              </View>
            </View>

            <Spacer vertical={layout.tablet ? 44 : 46} />

            <PaddedLabelButton
              title="Set up my account"
              horizontalPadding={layout.tablet ? 44 : 32}
              verticalPadding={layout.tablet ? 18 : 16}
              disabled={!isChecked}
              onPress={() => router.push("./GeneralSetup")}
              style={styles.cta}
              textStyle={styles.ctaLabel}
            />

            {layout.tablet ? (
              <Spacer vertical={responsiveMargin(14, 18)} />
            ) : (
              <View style={styles.bottomSpacer} />
            )}

            <View style={styles.footer}>
              <FooterLogo
                width={layout.footerLogoWidth}
                height={layout.footerLogoHeight}
              />
            </View>
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
  },
  patternSectionBase: {
    width: "100%",
    alignSelf: "stretch",
  },
  bodyColumn: {
    width: "100%",
  },
  body: {
    flex: 1,
    alignItems: "center",
  },
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
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
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
