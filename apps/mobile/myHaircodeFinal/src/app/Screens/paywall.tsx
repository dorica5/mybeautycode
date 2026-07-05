import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CheckCircle } from "phosphor-react-native";
import { router, useLocalSearchParams } from "expo-router";
import Logo from "../../../assets/images/myBeautyCode_logo.svg";
import { Typography } from "@/src/constants/Typography";
import {
  primaryBlack,
  primaryGreen,
  primaryWhite,
  secondaryGreen,
} from "@/src/constants/Colors";
import {
  responsiveBorderRadius,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import {
  MintBrandModalFooterRow,
  MintBrandModalPrimaryButton,
  MintBrandModalSecondaryButton,
} from "@/src/components/MintBrandModal";
import { NavBackRow } from "@/src/components/NavBackRow";
import { useBeautyCodeLogoSize } from "@/src/hooks/useBeautyCodeLogoSize";
import { useBilling } from "@/src/providers/BillingProvider";
import { mobileBillingConfig } from "@/src/constants/billingConfig";
import {
  findPackage,
  getOfferingsSafe,
  getRevenueCatApiKey,
  hasActiveEntitlement,
  packagePriceLabel,
  purchasePackageSafe,
  restorePurchasesSafe,
} from "@/src/lib/revenuecat";
import { useI18n } from "@/src/providers/LanguageProvider";
import type { Offerings } from "react-native-purchases";

type Plan = "monthly" | "annual";

const Paywall = () => {
  const { t } = useI18n();
  const logoSize = useBeautyCodeLogoSize();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { billing, syncFromRevenueCat, refreshBilling, revenueCatReady } =
    useBilling();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("monthly");
  const [busy, setBusy] = useState(false);
  const [offerings, setOfferings] = useState<Offerings | null>(null);

  const freeLimit =
    billing?.freeVisitLimit ?? mobileBillingConfig.FREE_VISIT_LIMIT;
  const monthlyPrice =
    billing?.monthlyPriceNok ?? mobileBillingConfig.MONTHLY_PRICE_NOK;
  const annualPrice = mobileBillingConfig.ANNUAL_PRICE_NOK;

  const monthlyPkg = useMemo(
    () => findPackage(offerings, "monthly"),
    [offerings]
  );
  const annualPkg = useMemo(() => findPackage(offerings, "annual"), [offerings]);

  const pricesNok: Record<Plan, string> = useMemo(
    () => ({
      monthly:
        packagePriceLabel(monthlyPkg) ??
        t("paywall.priceMonthly", { price: monthlyPrice }),
      annual:
        packagePriceLabel(annualPkg) ??
        t("paywall.priceAnnual", { price: annualPrice }),
    }),
    [annualPkg, annualPrice, monthlyPkg, monthlyPrice, t]
  );

  const primaryCta = useMemo(() => {
    if (selectedPlan === "annual") {
      return t("paywall.startSubscriptionAnnual", { price: annualPrice });
    }
    return t("paywall.startSubscriptionMonthly", { price: monthlyPrice });
  }, [annualPrice, monthlyPrice, selectedPlan, t]);

  const afterTrialLine = useMemo(() => {
    if (selectedPlan === "annual") {
      return t("paywall.afterTrialAnnual", { price: annualPrice });
    }
    return t("paywall.afterTrialMonthly", { price: monthlyPrice });
  }, [annualPrice, monthlyPrice, selectedPlan, t]);

  const freeFeatures = useMemo(
    () => [t("paywall.featureDiscovery")],
    [t]
  );

  const proFeatures = useMemo(
    () => [
      t("paywall.featureManageClients"),
      t("paywall.featureGallery"),
      t("paywall.featureHistory"),
    ],
    [t]
  );

  useEffect(() => {
    if (billing?.hasActiveSubscription && from === "visit-limit") {
      router.back();
    }
  }, [billing?.hasActiveSubscription, from]);

  useEffect(() => {
    if (!getRevenueCatApiKey() || !revenueCatReady) return;
    let alive = true;
    void (async () => {
      const next = await getOfferingsSafe();
      if (alive) setOfferings(next);
    })();
    return () => {
      alive = false;
    };
  }, [revenueCatReady]);

  const openLink = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert(t("common.cannotOpenLink"));
    } catch {
      Alert.alert(t("common.cannotOpenLink"));
    }
  };

  const runPurchase = async () => {
    const apiKey = getRevenueCatApiKey();
    if (!apiKey || !revenueCatReady) {
      Alert.alert(t("common.comingSoon"), t("paywall.rcNotConfigured"));
      return;
    }

    setBusy(true);
    try {
      const loadedOfferings = offerings ?? (await getOfferingsSafe());
      if (!offerings && loadedOfferings) setOfferings(loadedOfferings);

      const pkg = findPackage(loadedOfferings, selectedPlan);
      if (!pkg) {
        Alert.alert(t("common.comingSoon"), t("paywall.productsNotAvailable"));
        return;
      }

      const info = await purchasePackageSafe(pkg);
      if (!info) return;

      if (!hasActiveEntitlement(info)) {
        Alert.alert(t("common.error"), t("paywall.purchaseFailed"));
        return;
      }

      await syncFromRevenueCat(info);
      await refreshBilling();
      Alert.alert(t("common.success"), t("billing.subscribedVisitsUnlimited"));
      if (router.canGoBack()) router.back();
      else router.replace("/(professional)/(tabs)/home");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("paywall.purchaseFailed");
      Alert.alert(t("common.error"), msg);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    const apiKey = getRevenueCatApiKey();
    if (!apiKey || !revenueCatReady) {
      Alert.alert(t("common.comingSoon"), t("paywall.rcNotConfigured"));
      return;
    }
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
      const msg = e instanceof Error ? e.message : t("paywall.purchaseFailed");
      Alert.alert(t("common.error"), msg);
    } finally {
      setBusy(false);
    }
  };

  const PlanCard = ({
    plan,
    title,
    subtitle,
    disabled,
  }: {
    plan: Plan;
    title: string;
    subtitle: string;
    disabled?: boolean;
  }) => {
    const selected = selectedPlan === plan;
    return (
      <Pressable
        onPress={() => !disabled && setSelectedPlan(plan)}
        style={({ pressed }) => [
          styles.planCard,
          selected && styles.planCardSelected,
          disabled && styles.planCardDisabled,
          pressed && !disabled && { opacity: 0.92 },
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: !!disabled }}
        accessibilityLabel={`${title}. ${subtitle}`}
      >
        <View style={styles.planRow}>
          <View style={styles.planLeft}>
            <CheckCircle
              size={responsiveScale(22)}
              weight={selected ? "fill" : "regular"}
              color={selected ? primaryBlack : `${primaryBlack}55`}
            />
            <View style={styles.planText}>
              <Text style={styles.planTitle}>{title}</Text>
              <Text style={styles.planSubtitle}>{subtitle}</Text>
            </View>
          </View>
          <Text style={styles.planPrice}>{pricesNok[plan]}</Text>
        </View>

        {plan === "monthly" ? (
          <View style={styles.trialChip}>
            <Text style={styles.trialChipLabel}>
              {t("paywall.freeVisitsChip", { limit: freeLimit })}
            </Text>
          </View>
        ) : (
          <View style={styles.trialChip} />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <NavBackRow
          onPress={() => router.back()}
          style={styles.backRow}
          hitSlop={12}
          accessibilityLabel={t("common.goBack")}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Logo width={logoSize.width * 0.72} height={logoSize.height * 0.72} />

          <Text style={[Typography.h3, styles.h1]}>
            {t("paywall.tryProTitle")}
          </Text>
          <Text style={[Typography.bodyMedium, styles.subhead]}>
            {t("paywall.tryProSubtitle", { limit: freeLimit })}
          </Text>
          {billing && !billing.hasActiveSubscription ? (
            <Text style={[Typography.bodySmall, styles.usageLine]}>
              {t("billing.visitUsage", {
                used: billing.visitCount,
                limit: billing.freeVisitLimit,
              })}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <PlanCard
            plan="monthly"
            title={t("paywall.monthly")}
            subtitle={t("paywall.monthlySubtitle")}
            disabled={revenueCatReady && !monthlyPkg}
          />
          <PlanCard
            plan="annual"
            title={t("paywall.yearly")}
            subtitle={t("paywall.yearlySubtitle")}
            disabled={revenueCatReady && !annualPkg}
          />
        </View>

        <View style={styles.section}>
          <Text style={[Typography.label, styles.sectionTitle]}>
            {t("paywall.includedTitle")}
          </Text>
          {freeFeatures.map((line) => (
            <View key={line} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={[Typography.bodyMedium, styles.bulletText]}>
                {line}
              </Text>
            </View>
          ))}
          <Text style={[Typography.label, styles.sectionTitle, styles.sectionTitleSpaced]}>
            {t("paywall.subscribePro")}
          </Text>
          {proFeatures.map((line) => (
            <View key={line} style={styles.bulletRow}>
              <View style={[styles.bulletDot, styles.bulletDotPro]} />
              <Text style={[Typography.bodyMedium, styles.bulletText]}>
                {line}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.ctaBlock}>
          <MintBrandModalFooterRow>
            <MintBrandModalPrimaryButton
              label={busy ? t("inspiration.pleaseWait") : primaryCta}
              onPress={busy ? () => {} : runPurchase}
              accessibilityLabel={primaryCta}
            />
            <MintBrandModalSecondaryButton
              label={t("profile.restorePurchases")}
              onPress={busy ? () => {} : handleRestore}
            />
          </MintBrandModalFooterRow>

          <Text style={[Typography.bodySmall, styles.afterTrial]}>
            {afterTrialLine}
          </Text>

          <View style={styles.linkRow}>
            <Pressable
              onPress={() => openLink("https://example.com/terms")}
              accessibilityRole="link"
            >
              <Text style={styles.link}>{t("paywall.termsLink")}</Text>
            </Pressable>
            <Text style={styles.linkSep}>·</Text>
            <Pressable
              onPress={() => openLink("https://example.com/privacy")}
              accessibilityRole="link"
            >
              <Text style={styles.link}>{t("paywall.privacyLink")}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Paywall;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  topBar: {
    paddingHorizontal: responsivePadding(8),
    paddingTop: responsiveMargin(6),
  },
  backRow: {
    alignSelf: "flex-start",
    paddingHorizontal: responsivePadding(12),
    paddingVertical: responsivePadding(10),
  },
  scroll: {
    paddingHorizontal: responsivePadding(24),
    paddingBottom: responsiveMargin(28),
  },
  header: {
    alignItems: "center",
    marginTop: responsiveMargin(6),
    marginBottom: responsiveMargin(22),
  },
  h1: {
    textAlign: "center",
    marginTop: responsiveMargin(18),
  },
  subhead: {
    textAlign: "center",
    marginTop: responsiveMargin(10),
    maxWidth: 360,
    opacity: 0.82,
  },
  usageLine: {
    textAlign: "center",
    marginTop: responsiveMargin(10),
    opacity: 0.7,
  },
  section: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    marginBottom: responsiveMargin(22),
  },
  sectionTitle: {
    color: primaryBlack,
    marginBottom: responsiveMargin(12),
  },
  sectionTitleSpaced: {
    marginTop: responsiveMargin(16),
  },
  planCard: {
    backgroundColor: primaryWhite,
    borderRadius: responsiveBorderRadius(18),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: `${primaryBlack}18`,
    padding: responsivePadding(16),
    marginBottom: responsiveMargin(12),
    overflow: "hidden",
  },
  planCardSelected: {
    borderColor: primaryBlack,
    backgroundColor: `${secondaryGreen}66`,
  },
  planCardDisabled: {
    opacity: 0.55,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: responsiveMargin(12),
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveMargin(10),
    flex: 1,
    paddingRight: responsivePadding(6),
  },
  planText: {
    flex: 1,
  },
  planTitle: {
    ...Typography.bodyLarge,
    color: primaryBlack,
  },
  planSubtitle: {
    ...Typography.bodySmall,
    color: primaryBlack,
    opacity: 0.65,
    marginTop: responsiveMargin(4),
    lineHeight: responsiveScale(20),
  },
  planPrice: {
    ...Typography.bodyMedium,
    color: primaryBlack,
  },
  trialChip: {
    marginTop: responsiveMargin(12),
    alignSelf: "flex-start",
    borderRadius: responsiveScale(999),
    paddingHorizontal: responsivePadding(10),
    paddingVertical: responsivePadding(6),
    backgroundColor: `${secondaryGreen}CC`,
  },
  trialChipLabel: {
    ...Typography.bodySmall,
    color: primaryBlack,
    opacity: 0.85,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: responsiveMargin(10),
    marginBottom: responsiveMargin(10),
  },
  bulletDot: {
    width: responsiveScale(6),
    height: responsiveScale(6),
    borderRadius: responsiveScale(3),
    backgroundColor: primaryBlack,
    marginTop: responsiveMargin(8),
    opacity: 0.6,
  },
  bulletDotPro: {
    opacity: 0.35,
  },
  bulletText: {
    flex: 1,
    color: primaryBlack,
    opacity: 0.9,
    lineHeight: responsiveScale(22),
  },
  ctaBlock: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  afterTrial: {
    textAlign: "center",
    color: primaryBlack,
    opacity: 0.62,
    marginTop: responsiveMargin(14),
    lineHeight: responsiveScale(20),
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: responsiveMargin(10),
    marginTop: responsiveMargin(14),
  },
  linkSep: {
    color: primaryBlack,
    opacity: 0.35,
  },
  link: {
    ...Typography.bodySmall,
    color: primaryBlack,
    textDecorationLine: "underline",
    opacity: 0.78,
  },
});
