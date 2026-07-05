import React from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ticket } from "phosphor-react-native";
import { Typography } from "@/src/constants/Typography";
import {
  primaryBlack,
  primaryWhite,
  secondaryGreen,
} from "@/src/constants/Colors";
import {
  responsiveBorderRadius,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { useBilling } from "@/src/providers/BillingProvider";
import { useI18n } from "@/src/providers/LanguageProvider";
import { useVisitLimitGate } from "@/src/hooks/useVisitLimitGate";

export type ProVisitQuotaVariant = "pill" | "banner";

type ProVisitQuotaChipProps = {
  variant?: ProVisitQuotaVariant;
  style?: ViewStyle;
};

/**
 * Professionals only — shows free visit quota. Clients never see this (billing is pro-only).
 */
export function ProVisitQuotaChip({
  variant = "pill",
  style,
}: ProVisitQuotaChipProps) {
  const { billing, loading } = useBilling();
  const { t } = useI18n();
  const { openPaywall } = useVisitLimitGate("view");

  if (loading || !billing?.isProfessional) return null;

  if (billing.hasActiveSubscription && billing.plan !== "dev_bypass") {
    if (variant === "pill") {
      return (
        <View style={[styles.pill, styles.pillSubscribed, style]} accessibilityRole="text">
          <Ticket
            size={responsiveScale(18)}
            color={primaryBlack}
            weight="duotone"
          />
          <Text style={styles.pillLabel}>{t("billing.subscribedVisitsUnlimited")}</Text>
        </View>
      );
    }
    return (
      <View
        style={[styles.bannerCompact, styles.pillSubscribed, style]}
        accessibilityRole="text"
      >
        <Ticket size={responsiveScale(18)} color={primaryBlack} weight="duotone" />
        <Text style={styles.bannerRemaining}>{t("billing.subscribedVisitsUnlimited")}</Text>
      </View>
    );
  }

  const remainingLabel =
    billing.remainingFreeVisits === 1
      ? t("billing.visitsRemainingOne")
      : t("billing.visitsRemaining", {
          count: billing.remainingFreeVisits,
        });

  if (billing.atVisitLimit) {
    if (variant === "pill") {
      return (
        <Pressable
          style={[styles.pill, styles.pillLocked, style]}
          onPress={openPaywall}
          accessibilityRole="button"
          accessibilityLabel={t("billing.limitReachedTitle")}
        >
          <Text style={styles.pillLabel}>{t("billing.limitReachedTitle")}</Text>
          <Text style={styles.pillSub}>{t("billing.subscribeToContinue")}</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        style={[styles.banner, styles.bannerLocked, style]}
        onPress={openPaywall}
        accessibilityRole="button"
      >
        <Text style={styles.bannerTitle}>{t("billing.limitReachedTitle")}</Text>
        <Text style={styles.bannerBody}>
          {t("billing.limitReachedView", { limit: billing.freeVisitLimit })}
        </Text>
        <Text style={styles.bannerCta}>{t("billing.subscribeToContinue")}</Text>
      </Pressable>
    );
  }

  if (variant === "pill") {
    return (
      <View
        style={[styles.pill, style]}
        accessibilityRole="text"
        accessibilityLabel={remainingLabel}
      >
        <Ticket
          size={responsiveScale(18)}
          color={primaryBlack}
          weight="duotone"
        />
        <Text style={styles.pillLabel}>{remainingLabel}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bannerCompact, style]} accessibilityRole="text">
      <Ticket size={responsiveScale(18)} color={primaryBlack} weight="duotone" />
      <Text style={styles.bannerRemaining}>{remainingLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: responsiveMargin(8),
    paddingVertical: responsiveScale(10),
    paddingHorizontal: responsiveScale(20),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
  },
  pillLocked: {
    flexDirection: "column",
    gap: responsiveMargin(4),
    backgroundColor: `${secondaryGreen}66`,
    paddingVertical: responsiveScale(12),
  },
  pillSubscribed: {
    backgroundColor: `${secondaryGreen}88`,
  },
  pillLabel: {
    ...Typography.outfitRegular16,
    color: primaryBlack,
    textAlign: "center",
  },
  pillSub: {
    ...Typography.bodySmall,
    color: primaryBlack,
    opacity: 0.72,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  banner: {
    alignSelf: "center",
    maxWidth: "92%",
    marginBottom: responsiveMargin(12),
    padding: responsivePadding(14),
    borderRadius: responsiveBorderRadius(18),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
  },
  bannerCompact: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: responsiveMargin(8),
    marginBottom: responsiveMargin(12),
    paddingVertical: responsiveScale(10),
    paddingHorizontal: responsiveScale(18),
    borderRadius: responsiveScale(999),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryWhite,
  },
  bannerLocked: {
    backgroundColor: `${secondaryGreen}55`,
    alignItems: "center",
  },
  bannerRemaining: {
    ...Typography.outfitRegular16,
    color: primaryBlack,
    textAlign: "center",
  },
  bannerTitle: {
    ...Typography.bodyLarge,
    color: primaryBlack,
    textAlign: "center",
  },
  bannerBody: {
    ...Typography.bodyMedium,
    color: primaryBlack,
    opacity: 0.82,
    textAlign: "center",
    marginTop: responsiveMargin(8),
  },
  bannerCta: {
    ...Typography.label,
    color: primaryBlack,
    textAlign: "center",
    marginTop: responsiveMargin(10),
    textDecorationLine: "underline",
  },
});

/** @deprecated Use ProVisitQuotaChip with variant="banner" */
export function VisitBillingBanner() {
  return <ProVisitQuotaChip variant="banner" />;
}
