/* eslint-disable react/react-in-jsx-scope */
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CheckMail = () => {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text
          accessibilityRole="header"
          style={[Typography.h3, styles.headline]}
        >
          Password sent
        </Text>
        <View style={styles.card}>
          <Text style={[Typography.bodyLarge, styles.cardText]}>
            Please check your e-mail
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CheckMail;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsivePadding(24),
  },
  headline: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(28),
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(20),
    paddingVertical: responsivePadding(28),
    paddingHorizontal: responsivePadding(24),
    alignSelf: "center",
  },
  cardText: {
    color: primaryBlack,
    textAlign: "center",
  },
});
