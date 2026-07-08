import React, { useCallback, useMemo, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
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
  openStoreSubscriptionManagement,
  presentCustomerCenterSafe,
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
  const {
    billing,
    isProAccount,
    revenueCatReady,
    syncFromRevenueCat,
    refreshBilling,
  } = useBilling();
  const cardWidth = useBillingCardWidth();
  const [busy, setBusy] = useState(false);

  const subtitle = useMemo(
    () =>
      t("profile.billingSubtitle", {
        limit: billing?.freeVisitLimit ?? mobileBillingConfig.FREE_VISIT_LIMIT,
      }),
    [billing, t]
  );

  useFocusEffect(
    useCallback(() => {
      if (!getRevenueCatApiKey() || !revenueCatReady) return;
      void syncFromRevenueCat();
    }, [revenueCatReady, syncFromRevenueCat])
  );

  const ensureRevenueCat = () => {
    if (getRevenueCatApiKey() && revenueCatReady) return true;
    Alert.alert(t("profile.billing"), t("paywall.rcNotConfigured"));
    return false;
  };

  const handleManageCancel = async () => {
    if (!ensureRevenueCat()) return;

    setBusy(true);
    try {
      await presentCustomerCenterSafe({
        onRestoreCompleted: ({ customerInfo }) => {
          void syncFromRevenueCat(customerInfo);
        },
      });
      await syncFromRevenueCat();
      await refreshBilling();
    } catch {
      const opened = await openStoreSubscriptionManagement();
      if (!opened) {
        Alert.alert(t("common.error"), t("profile.manageCancelFailed"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleChangePlan = () => {
    if (!ensureRevenueCat()) return;
    router.push({
      pathname: "/Screens/paywall",
      params: { from: "billing" },
    });
  };

  const handleRestore = async () => {
    if (!ensureRevenueCat()) return;

    setBusy(true);
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
    } finally {
      setBusy(false);
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
                onPress={busy ? undefined : handleManageCancel}
              />
              <View style={styles.cardDivider} />
              <Profile
                title={t("profile.changePlan")}
                Icon={ArrowsLeftRight}
                tileStyle="light"
                groupPosition="middle"
                onPress={busy ? undefined : handleChangePlan}
              />
              <View style={styles.cardDivider} />
              <Profile
                title={t("profile.restorePurchases")}
                Icon={ArrowCounterClockwise}
                tileStyle="light"
                groupPosition="last"
                onPress={busy ? undefined : handleRestore}
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
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: primaryWhite,
    marginBottom: responsiveScale(46, 36),
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: "rgba(33, 36, 39, 0.12)",
    flexShrink: 0,
  },
});
