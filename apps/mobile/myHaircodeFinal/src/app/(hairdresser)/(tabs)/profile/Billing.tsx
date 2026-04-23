import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CaretLeft, CreditCard, ArrowCounterClockwise, ArrowsLeftRight } from "phosphor-react-native";
import { router } from "expo-router";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import Profile from "@/src/components/Profile";
import { responsiveScale, scalePercent } from "@/src/utils/responsive";

export default function BillingScreen() {
  const subtitle = useMemo(
    () =>
      "Your current plan will appear here once billing is integrated.\n\nTrial: 7 days · Monthly: NOK 199 · Yearly: NOK 1,999 · Lifetime: NOK 4,999",
    []
  );

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backRow}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title} accessibilityRole="header">
            Billing
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.cardStack}>
            <Profile
              title="Manage / cancel subscription"
              Icon={CreditCard}
              tileStyle="light"
              groupPosition="first"
              onPress={() =>
                Alert.alert(
                  "Coming soon",
                  "Manage/cancel subscription will be available when billing is integrated."
                )
              }
            />
            <Profile
              title="Change plan"
              Icon={ArrowsLeftRight}
              tileStyle="light"
              groupPosition="middle"
              onPress={() =>
                Alert.alert(
                  "Coming soon",
                  "Plan changes will be available when billing is integrated."
                )
              }
            />
            <Profile
              title="Restore purchases"
              Icon={ArrowCounterClockwise}
              tileStyle="light"
              groupPosition="last"
              onPress={() =>
                Alert.alert(
                  "Restore purchases",
                  "Restore will be enabled when billing is integrated."
                )
              }
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveScale(4),
    paddingHorizontal: scalePercent(5),
    paddingVertical: responsiveScale(10, 8),
    alignSelf: "flex-start",
  },
  backText: {
    ...Typography.bodySmall,
    color: primaryBlack,
  },
  scroll: {
    paddingBottom: responsiveScale(28),
  },
  title: {
    ...Typography.h3,
    textAlign: "center",
    color: primaryBlack,
    marginTop: responsiveScale(10, 8),
  },
  subtitle: {
    ...Typography.bodySmall,
    textAlign: "center",
    color: primaryBlack,
    opacity: 0.68,
    marginTop: responsiveScale(10, 8),
    marginHorizontal: scalePercent(10),
    lineHeight: responsiveScale(22, 20),
    marginBottom: responsiveScale(18, 14),
  },
  cardStack: {
    marginTop: responsiveScale(4),
  },
});

