import { Text, StyleSheet, ScrollView } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/src/constants/Colors";
import TopNav from "@/src/components/TopNav";
import Logo from "@assets/myHaircode_full_logo.svg";
import { moderateScale, responsiveFontSize, scale, scalePercent, verticalScale } from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";

const TermsAndConditionsScreen = () => {
  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.dark.yellowish} />
      <SafeAreaView style={styles.container}>
        {/* Top Navigation Bar */}
        <TopNav title="Terms and Privacy" />

        <Logo style={[styles.logo, { width: 73, height: 97.5 }]} />

        {/* Scrollable content */}
        <ScrollView contentContainerStyle={styles.scrollView}>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            {/* Your Terms and Conditions or Privacy Policy text goes here */}
            Welcome to myHaircode! By accessing or using our app, you agree to
            comply with these Terms and Conditions. Please read them carefully
            before using the app
            {/* Add more content as needed */}
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>General Information</Text>

          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            myHaircode is a journal system for the hair industry that connects
            clients and hairdressers, allowing clients to share their complete
            treatment history with their hairdressers. Available on both iOS and
            Android.
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>Eligibility & Account Creation</Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            The app is open to everyone who wants to connect with hairdressers or clients. 
            Both must create an account to access personalized features and save their 
            information securely.
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>User Responsibilities & Content</Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            Hairdressers can upload images, text, and videos only if the client
            has agreed to share their journal. Both clients and hairdressers can
            delete content ("haircodes"). Hairdressers can edit haircodes only
            within 7 days of creation. Clients can revoke a hairdresser's access
            to their haircodes at any time. Users may not upload inappropriate
            images or offensive text. Violation of this rule will result in a
            permanent ban without a refund.
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}>Privacy & Data Collection</Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            For Hairdressers:{"\n"}Collected Data: Full name, profile picture,
            email, about me, salon phone number, salon name, and salon location.
            We also track client relationships (i.e., which clients have shared
            haircodes with them). Treatment prices are stored but are only visible
            to the hairdresser.{"\n"}For Clients:{"\n"}Collected Data: Full name,
            phone number, profile picture, about me, hair thickness, hair
            structure, gray hair percentage, and natural hair color. We also store
            records of which hairdressers have access to their haircodes.
          </Text>

          <Text style={[styles.header, {fontSize: responsiveFontSize(20, 14)}]}> Liability Disclaimer</Text>
          <Text style={[styles.textContent, {fontSize: responsiveFontSize(16, 10)}]}>
            myHaircode provides a platform for journaling hair treatments, but we
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
            questions or support, contact us at hello@my-haircode.com.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.yellowish,
  },
  scrollView: {
    paddingTop: verticalScale(30), // Ensure text doesn't overlap with the TopNav
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