import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { NavBackRow } from "@/src/components/NavBackRow";
import { MintBrandModalSecondaryButton } from "@/src/components/MintBrandModal";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { useI18n } from "@/src/providers/LanguageProvider";

type UnblockUserPillProps = {
  label: string;
  onPress: () => void;
  style?: object;
  accessibilityLabel?: string;
};

/** On-brand outline pill — use wherever an unblock action sits inline. */
export function UnblockUserPill({
  label,
  onPress,
  style,
  accessibilityLabel,
}: UnblockUserPillProps) {
  return (
    <View style={[styles.pillWrap, style]}>
      <MintBrandModalSecondaryButton
        label={label}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel ?? label}
      />
    </View>
  );
}

type BlockedProfileScreenProps = {
  onUnblock: () => void;
  onBack?: () => void;
  unblockLabel?: string;
};

/** Full-screen mint state after blocking someone from their profile. */
export function BlockedProfileScreen({
  onUnblock,
  onBack,
  unblockLabel,
}: BlockedProfileScreenProps) {
  const { t } = useI18n();
  const handleBack = onBack ?? (() => router.back());

  return (
    <>
      <StatusBar style="dark" backgroundColor={primaryGreen} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <NavBackRow
          onPress={handleBack}
          style={styles.backRow}
          accessibilityLabel={t("common.goBack")}
          hitSlop={12}
        />
        <View style={styles.content}>
          <Text style={[Typography.h3, styles.title]}>
            {t("moderation.accountBlocked")}
          </Text>
          <Text style={[Typography.bodyMedium, styles.message]}>
            {t("moderation.accountBlockedMessage", {
              brand: BRAND_DISPLAY_NAME,
            })}
          </Text>
          <UnblockUserPill
            label={unblockLabel ?? t("profile.unblock")}
            onPress={onUnblock}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

type BlockedInlineNoticeProps = {
  onUnblock: () => void;
  unblockLabel?: string;
  style?: object;
};

/** Short blocked copy + unblock pill for mint profile shells. */
export function BlockedInlineNotice({
  onUnblock,
  unblockLabel,
  style,
}: BlockedInlineNoticeProps) {
  const { t } = useI18n();

  return (
    <View style={[styles.inlineWrap, style]}>
      <Text style={[Typography.bodyMedium, styles.inlineMessage]}>
        {t("moderation.accountBlockedMessage", {
          brand: BRAND_DISPLAY_NAME,
        })}
      </Text>
      <UnblockUserPill
        label={unblockLabel ?? t("profile.unblockUser")}
        onPress={onUnblock}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  backRow: {
    alignSelf: "flex-start",
    paddingHorizontal: responsivePadding(16),
    paddingVertical: responsiveMargin(12),
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsivePadding(28),
    paddingBottom: responsiveMargin(48),
  },
  title: {
    textAlign: "center",
    marginBottom: responsiveMargin(12),
    color: primaryBlack,
  },
  message: {
    textAlign: "center",
    maxWidth: 340,
    marginBottom: responsiveMargin(28),
    color: primaryBlack,
    opacity: 0.9,
  },
  pillWrap: {
    alignItems: "center",
    alignSelf: "stretch",
    maxWidth: 400,
  },
  inlineWrap: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    alignItems: "center",
    gap: responsiveMargin(16),
    marginTop: responsiveMargin(8),
  },
  inlineMessage: {
    textAlign: "center",
    color: primaryBlack,
    opacity: 0.88,
    paddingHorizontal: responsivePadding(8),
  },
});
