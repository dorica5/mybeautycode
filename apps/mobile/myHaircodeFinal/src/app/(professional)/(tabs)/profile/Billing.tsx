import React, { useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CreditCard, ArrowCounterClockwise, ArrowsLeftRight } from "phosphor-react-native";
import { router } from "expo-router";
import { Typography } from "@/src/constants/Typography";
import { NavBackRow } from "@/src/components/NavBackRow";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import Profile from "@/src/components/Profile";
import { responsiveScale, scalePercent } from "@/src/utils/responsive";
import { useI18n } from "@/src/providers/LanguageProvider";

export default function BillingScreen() {
  const { t } = useI18n();
  const subtitle = useMemo(() => t("profile.billingSubtitle"), [t]);

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <NavBackRow
          onPress={() => router.back()}
          style={styles.backRow}
          hitSlop={12}
          accessibilityLabel={t("common.goBack")}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title} accessibilityRole="header">
            {t("profile.billing")}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.cardStack}>
            <Profile
              title={t("profile.manageCancelSubscription")}
              Icon={CreditCard}
              tileStyle="light"
              groupPosition="first"
              onPress={() =>
                Alert.alert(t("common.comingSoon"), t("profile.manageCancelSoon"))
              }
            />
            <Profile
              title={t("profile.changePlan")}
              Icon={ArrowsLeftRight}
              tileStyle="light"
              groupPosition="middle"
              onPress={() =>
                Alert.alert(t("common.comingSoon"), t("profile.changePlanSoon"))
              }
            />
            <Profile
              title={t("profile.restorePurchases")}
              Icon={ArrowCounterClockwise}
              tileStyle="light"
              groupPosition="last"
              onPress={() =>
                Alert.alert(t("profile.restorePurchases"), t("profile.restorePurchasesSoon"))
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
    alignSelf: "flex-start",
    paddingHorizontal: scalePercent(5),
    paddingVertical: responsiveScale(10, 8),
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

