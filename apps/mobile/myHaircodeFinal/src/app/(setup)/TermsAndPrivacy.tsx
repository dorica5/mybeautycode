import { Text, StyleSheet, ScrollView, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import { Colors, primaryBlack, primaryGreen } from "@/src/constants/Colors";
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

const TermsAndConditionsScreen = () => {
  return (
    <>
      <StatusBar style="dark" backgroundColor={primaryGreen} />
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <TopNav title="Terms and Privacy" showTitle={false} />

        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator
        >
          <Text
            style={[Typography.h3, styles.screenTitle]}
            accessibilityRole="header"
          >
            Terms and Privacy
          </Text>

          <KrusedullLogo
            width={responsiveScale(120)}
            height={responsiveScale((120 * 67) / 97)}
            style={styles.logo}
          />

          <View style={styles.scrollBody}>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {/* Your Terms and Conditions or Privacy Policy text goes here */}
            Welcome to {BRAND_DISPLAY_NAME}! By accessing or using our app, you agree to
            comply with these Terms and Conditions. Please read them carefully
            before using the app
            {/* Add more content as needed */}
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>General Information</Text>

          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {BRAND_DISPLAY_NAME} is a journal system for beauty services that connects
            clients and beauty practitioners, allowing clients to share their complete
            treatment history with professionals, and let clients find the exact professional they are looking for. Available on both iOS and
            Android.
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>Eligibility & Account Creation</Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            Create a client account first, then add another account for professional use.
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>User Responsibilities & Content</Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            Professionals can upload images, text, and videos only if the client
            has agreed to share their journal. Both clients and professionals can
            delete single visit cards. Professionals can edit visits only
            within 7 days of creation. Clients can revoke a professional's access
            to their data at any time. Users may not upload inappropriate
            images or offensive text. Violation of this rule will result in a
            permanent ban without a refund.
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>Privacy & Data Collection</Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            For Professionals:{"\n"}Collected Data: First name, last name, username, profile picture,
            email, about me, salon phone number, salon name, and salon location.
            We also track client relationships (i.e., which clients have shared
            access with them). Treatment prices are stored but are only visible
            to that specific professional who wrote it.{"\n"}For Clients:{"\n"}Collected Data: First name, last name,
            phone number, profile picture, about me.
            
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}> Liability Disclaimer</Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {BRAND_DISPLAY_NAME} provides a platform for journaling treatments and finding professionals, but we
            do not guarantee specific results or outcomes.
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>Account Termination & Enforcement</Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            Users who violate these Terms may have their accounts permanently
            banned. No refunds will be issued to banned users.
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>Changes to Terms</Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            We reserve the right to modify these terms at any time. Continued use
            of the app after changes constitutes acceptance of the new terms. For
            questions or support, contact us at hello@mybeautycode.com.
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
  screenTitle: {
    color: primaryBlack,
    textAlign: "center",
    width: "100%",
    marginTop: responsiveMargin(isTablet() ? 20 : 48),
    marginBottom: responsiveMargin(14),
  },
  scrollView: {
    paddingBottom: verticalScale(24),
  },
  scrollBody: {
    paddingHorizontal: scale(20),
  },
  textContent: {
    color: Colors.dark.dark,
    lineHeight: moderateScale(24),
    marginTop: scalePercent(2),
  },
  header: {
    color: Colors.dark.dark,
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