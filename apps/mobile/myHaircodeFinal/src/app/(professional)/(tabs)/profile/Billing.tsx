import React, { useMemo } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CreditCard, ArrowCounterClockwise, ArrowsLeftRight } from "phosphor-react-native";
import { router } from "expo-router";
import { Typography } from "@/src/constants/Typography";
import { NavBackRow } from "@/src/components/NavBackRow";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import Profile from "@/src/components/Profile";
import { mobileBillingConfig } from "@/src/constants/billingConfig";
import {
  contentCardMaxWidth,
  isTablet,
  responsiveBorderRadius,
  responsiveScale,
  scalePercent,
} from "@/src/utils/responsive";
import { useI18n } from "@/src/providers/LanguageProvider";
import { useBilling } from "@/src/providers/BillingProvider";
import { ProVisitQuotaChip } from "@/src/components/ProVisitQuotaChip";
import {
  getRevenueCatApiKey,
  hasActiveEntitlement,
  restorePurchasesSafe,
} from "@/src/lib/revenuecat";

function useBillingCardWidth(): number {
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const useWide = isTablet() || shortSide >= 560;
  return useWide ? contentCardMaxWidth(shortSide) : responsiveScale(342);
}

export default function BillingScreen() {
  const { t } = useI18n();
  const { billing, isProAccount, syncFromRevenueCat, refreshBilling } = useBilling();
  const cardWidth = useBillingCardWidth();

  const subtitle = useMemo(
    () =>
      t("profile.billingSubtitle", {
        limit: billing?.freeVisitLimit ?? mobileBillingConfig.FREE_VISIT_LIMIT,
        price: billing?.monthlyPriceNok ?? mobileBillingConfig.MONTHLY_PRICE_NOK,
      }),
    [billing, t]
  );

  const handleRestore = async () => {
    if (!getRevenueCatApiKey()) {
      Alert.alert(t("profile.restorePurchases"), t("profile.restorePurchasesSoon"));
      return;
    }
    try {
      const info = await restorePurchasesSafe();
      if (!hasActiveEntitlement(info)) {
        Alert.alert(t("profile.restorePurchases"), t("paywall.restoreEmpty"));
        return;
      }
      await syncFromRevenueCat(info);
      await refreshBilling();
      Alert.alert(t("profile.restorePurchases"), t("paywall.restoreSuccess"));
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e instanceof Error ? e.message : t("paywall.purchaseFailed")
      );
    }
  };

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
          <View style={styles.mainView}>
            <Text style={styles.title} accessibilityRole="header">
              {t("profile.billing")}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {isProAccount ? (
              <ProVisitQuotaChip
                variant="pill"
                style={styles.quotaPill}
              />
            ) : null}

            <View
              style={[
                styles.cardGroup,
                { width: cardWidth, borderRadius: responsiveBorderRadius(20) },
              ]}
            >
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
                  router.push({
                    pathname: "/Screens/paywall",
                    params: { from: "billing" },
                  })
                }
              />
              <Profile
                title={t("profile.restorePurchases")}
                Icon={ArrowCounterClockwise}
                tileStyle="light"
                groupPosition="last"
                onPress={handleRestore}
              />
            </View>
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
  mainView: {
    alignItems: "center",
    paddingBottom: scalePercent(8),
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
    maxWidth: responsiveScale(342),
  },
  quotaPill: {
    marginBottom: responsiveScale(20, 16),
  },
  cardGroup: {
    alignSelf: "center",
    overflow: "hidden",
    backgroundColor: primaryWhite,
    marginBottom: responsiveScale(46, 36),
  },
});
