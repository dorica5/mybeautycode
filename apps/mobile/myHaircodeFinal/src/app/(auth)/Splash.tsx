/* eslint-disable react/react-in-jsx-scope */
import Logo from "../../../assets/images/myBeautyCode_logo.svg";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { Href, router } from "expo-router";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { useBeautyCodeLogoSize } from "@/src/hooks/useBeautyCodeLogoSize";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** Top inset under safe area matching Sign in / Sign up: scroll `topPad` margin after inset + back row. */
const splashLogoTopPadding =
  responsiveMargin(8) +
  responsiveMargin(4) +
  responsiveScale(28) +
  responsiveMargin(4) +
  responsiveMargin(8);

const Splash = () => {
  const logoSize = useBeautyCodeLogoSize();
  const signUp = () => router.push("./SignUp" as Href);
  const goToSignIn = () => router.push("./SignIn");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Upper half: logo aligned with Sign in / Sign up */}
        <View style={styles.upperHalf}>
          <Logo width={logoSize.width} height={logoSize.height} />
        </View>

        {/* Lower half: headline starts ~mid-screen, then body, CTA, footer */}
        <View style={styles.lowerHalf}>
          <View style={styles.mainTextBlock}>
            <View style={styles.headlineWrap}>
              <Text style={[Typography.h3, styles.textOnGreen, styles.headlineLine]}>
                Welcome to
              </Text>
              <Text style={[Typography.h1, styles.textOnGreen, styles.headlineLine]}>
                myne!
              </Text>
            </View>

            <Text style={[Typography.bodyLarge, styles.textOnGreen, styles.body]}>
              my care, my way
            </Text>

            <PaddedLabelButton
              title="Sign in"
              horizontalPadding={32}
              verticalPadding={16}
              onPress={goToSignIn}
              style={styles.signInButton}
              textStyle={styles.signInButtonLabel}
            />
          </View>

          <View style={styles.lowerSpacer} />

          <View style={styles.footerRow}>
            <Text style={[Typography.label, styles.textOnGreen]}>
              {"Don't have an account yet? "}
            </Text>
            <Pressable onPress={signUp} hitSlop={8}>
              <Text
                style={[
                  Typography.label,
                  styles.textOnGreen,
                  styles.signUpBold,
                ]}
              >
                Sign up
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Splash;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  container: {
    flex: 1,
    backgroundColor: primaryGreen,
    paddingHorizontal: responsivePadding(24),
  },
  /** Logo only: same vertical offset as Sign in / Sign up (safe top + 8 + back row). */
  upperHalf: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: splashLogoTopPadding,
    paddingBottom: responsiveMargin(16),
  },
  /** ~50% height: “Welcome…” starts at screen midpoint. */
  lowerHalf: {
    flex: 1,
    alignItems: "center",
    width: "100%",
  },
  /** Welcome → body → Sign in; pulled up; footer stays on bottom via lowerSpacer. */
  mainTextBlock: {
    alignItems: "center",
    width: "100%",
    marginTop: -responsiveMargin(178),
  },
  lowerSpacer: {
    flex: 0.45,
    minHeight: responsiveMargin(8),
  },
  textOnGreen: {
    color: primaryBlack,
    textAlign: "center",
  },
  headlineWrap: {
    marginBottom: responsiveMargin(48),
    width: "100%",
    alignItems: "center",
  },
  headlineLine: {
    textAlign: "center",
    width: "100%",
  },
  body: {
    marginBottom: responsiveMargin(48),
    maxWidth: 340,
  },
  signInButton: {
    alignSelf: "center",
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
  signInButtonLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: responsiveMargin(24),
  },
  signUpBold: {
    fontFamily: "Outfit_700Bold",
    textDecorationLine: "underline",
  },
});
