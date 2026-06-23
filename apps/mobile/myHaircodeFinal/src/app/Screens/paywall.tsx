import React, { useMemo, useState } from "react";
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
import {
  clearPendingProfessionalSetup,
  getPendingProfessionalSetup,
} from "@/src/lib/pendingProfessionalSetup";
import { runProfessionalSetupCompletionSideEffects } from "@/src/lib/professionalSetupCompletion";
import { useUpdateSupabaseProfile } from "@/src/api/profiles";
import { useAuth } from "@/src/providers/AuthProvider";
import { usePostHog } from "posthog-react-native";
import { useI18n } from "@/src/providers/LanguageProvider";

type Plan = "monthly" | "annual" | "lifetime";

const Paywall = () => {
  const { t } = useI18n();
  const logoSize = useBeautyCodeLogoSize();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { profile, setLoadingSetup } = useAuth();
  const posthog = usePostHog();
  const { mutateAsync: persistProfile } = useUpdateSupabaseProfile();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [busy, setBusy] = useState(false);

  const pricesNok: Record<Plan, string> = {
    monthly: t("paywall.priceMonthly"),
    annual: t("paywall.priceAnnual"),
    lifetime: t("paywall.priceLifetime"),
  };

  const primaryCta = useMemo(() => {
    if (selectedPlan === "lifetime") return t("paywall.unlockLifetime");
    return t("paywall.startFreeTrial");
  }, [selectedPlan, t]);

  const afterTrialLine = useMemo(() => {
    if (selectedPlan === "lifetime") return t("paywall.afterTrialLifetime");
    if (selectedPlan === "annual") return t("paywall.afterTrialAnnual");
    return t("paywall.afterTrialMonthly");
  }, [selectedPlan, t]);

  const includedFeatures = useMemo(
    () => [
      t("paywall.featureManageClients"),
      t("paywall.featureGallery"),
      t("paywall.featureHistory"),
      t("paywall.featureDiscovery"),
    ],
    [t]
  );

  const openLink = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert(t("common.cannotOpenLink"));
    } catch {
      Alert.alert(t("common.cannotOpenLink"));
    }
  };

  const handlePrimary = async () => {
    setBusy(true);
    try {
      if (from === "professional-setup") {
        const pending = getPendingProfessionalSetup();
        if (!pending) {
          Alert.alert(
            t("paywall.couldNotContinue"),
            t("paywall.setupDataLost")
          );
          return;
        }
        setLoadingSetup(true);
        try {
          await persistProfile(pending.updateBody);
          await runProfessionalSetupCompletionSideEffects({
            userId: pending.userId,
            professionCode: pending.professionCode,
            profile,
            posthog,
          });
          clearPendingProfessionalSetup();
        } catch (e) {
          console.error("Professional setup save after paywall:", e);
          const msg =
            e instanceof Error ? e.message : t("setup.pleaseTryAgain");
          Alert.alert(t("paywall.couldNotSaveProfile"), msg);
          return;
        } finally {
          setLoadingSetup(false);
        }
      }

      // UI-only paywall for now (backend / billing integration later).
      Alert.alert(
        t("common.comingSoon"),
        t("profile.billingSubtitle")
      );
      if (from === "professional-setup") {
        router.replace("/(professional)/(tabs)/home");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (from === "professional-setup") {
      clearPendingProfessionalSetup();
    }
    router.back();
  };

  const PlanCard = ({
    plan,
    title,
    subtitle,
    badge,
  }: {
    plan: Plan;
    title: string;
    subtitle: string;
    badge?: string;
  }) => {
    const selected = selectedPlan === plan;
    return (
      <Pressable
        onPress={() => setSelectedPlan(plan)}
        style={({ pressed }) => [
          styles.planCard,
          selected && styles.planCardSelected,
          pressed && { opacity: 0.92 },
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${title}. ${subtitle}`}
      >
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{badge}</Text>
          </View>
        ) : null}

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

        {plan !== "lifetime" ? (
          <View style={styles.trialChip}>
            <Text style={styles.trialChipLabel}>{t("paywall.freeTrialChip")}</Text>
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
          onPress={handleBack}
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
            {t("paywall.tryProSubtitle")}
          </Text>
        </View>

        <View style={styles.section}>
          <PlanCard
            plan="annual"
            title={t("paywall.yearly")}
            subtitle={t("paywall.yearlySubtitle")}
            badge={t("paywall.saveBadge")}
          />
          <PlanCard
            plan="monthly"
            title={t("paywall.monthly")}
            subtitle={t("paywall.monthlySubtitle")}
          />
          <PlanCard
            plan="lifetime"
            title={t("paywall.lifetime")}
            subtitle={t("paywall.lifetimeSubtitle")}
          />
        </View>

        <View style={styles.section}>
          <Text style={[Typography.label, styles.sectionTitle]}>
            {t("paywall.includedTitle")}
          </Text>
          {includedFeatures.map((line) => (
            <View key={line} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
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
              onPress={busy ? () => {} : handlePrimary}
              accessibilityLabel={primaryCta}
            />
            <MintBrandModalSecondaryButton
              label={t("profile.restorePurchases")}
              onPress={() =>
                Alert.alert(
                  t("profile.restorePurchases"),
                  t("profile.restorePurchasesSoon")
                )
              }
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
  badge: {
    position: "absolute",
    top: responsiveMargin(10),
    right: responsiveMargin(10),
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
    paddingHorizontal: responsivePadding(10),
    paddingVertical: responsivePadding(6),
  },
  badgeLabel: {
    ...Typography.bodySmall,
    color: primaryWhite,
    opacity: 0.95,
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