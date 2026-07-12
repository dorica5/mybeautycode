import { Text, StyleSheet, ScrollView, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import TopNav from "@/src/components/TopNav";
import KrusedullLogo from "@assets/logo_2.svg";
import {
  isTablet,
  moderateScale,
  responsiveFontSize,
  responsiveMargin,
  responsiveScale,
  scale,
  scalePercent,
  verticalScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { useI18n } from "@/src/providers/LanguageProvider";
import { mobileBillingConfig } from "@/src/constants/billingConfig";

const TermsAndConditionsScreen = () => {
  const { t } = useI18n();
  return (
    <>
      <StatusBar style="dark" backgroundColor={primaryGreen} />
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <TopNav title={t("setup.termsAndPrivacy")} showTitle={false} />

        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator
        >
          <View style={styles.screenTitleWrap}>
            <Text
              style={[Typography.h3, styles.screenTitle]}
              accessibilityRole="header"
            >
              {t("setup.termsAndPrivacy")}
            </Text>
          </View>

          <KrusedullLogo
            width={responsiveScale(120)}
            height={responsiveScale((120 * 67) / 97)}
            style={styles.logo}
          />

          <View style={styles.scrollBody}>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {t("termsLegal.welcome", { brand: BRAND_DISPLAY_NAME })}
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>
            {t("termsLegal.generalInfo")}
          </Text>

          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {t("termsLegal.generalInfoBody", { brand: BRAND_DISPLAY_NAME })}
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>
            {t("termsLegal.eligibility")}
          </Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {t("termsLegal.eligibilityBody")}
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>
            {t("termsLegal.responsibilities")}
          </Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {t("termsLegal.responsibilitiesBody")}
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>
            {t("termsLegal.privacy")}
          </Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {t("termsLegal.privacyBodyPro")}
            {"\n"}
            {t("termsLegal.privacyBodyClient")}
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>
            {t("termsLegal.subscriptions")}
          </Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {t("termsLegal.subscriptionsBody", {
              limit: mobileBillingConfig.FREE_VISIT_LIMIT,
            })}
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>
            {t("termsLegal.liability")}
          </Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {t("termsLegal.liabilityBody", { brand: BRAND_DISPLAY_NAME })}
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>
            {t("termsLegal.termination")}
          </Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {t("termsLegal.terminationBody")}
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>
            {t("termsLegal.changes")}
          </Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {t("termsLegal.changesBody")}
          </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scrollFlex: {
    flex: 1,
  },
  screenTitleWrap: {
    width: "100%",
    overflow: "visible",
    marginTop: responsiveMargin(isTablet() ? 20 : 48),
    marginBottom: responsiveMargin(14),
  },
  screenTitle: {
    color: primaryBlack,
    textAlign: "center",
    width: "100%",
  },
  scrollView: {
    paddingBottom: verticalScale(24),
  },
  scrollBody: {
    paddingHorizontal: scale(20),
  },
  textContent: {
    color: primaryBlack,
    lineHeight: moderateScale(24),
    marginTop: scalePercent(2),
  },
  header: {
    color: primaryBlack,
    fontFamily: "Inter-SemiBold",
    lineHeight: moderateScale(24),
    marginTop: verticalScale(20),
  },
  logo: {
    alignSelf: "center",
    marginTop: verticalScale(20),
    marginBottom: verticalScale(20),
  },
});

export default TermsAndConditionsScreen;