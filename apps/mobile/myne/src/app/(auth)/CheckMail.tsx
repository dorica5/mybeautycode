/* eslint-disable react/react-in-jsx-scope */
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { PrimaryOutlineTextField } from "@/src/components/PrimaryOutlineTextField";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  isPasswordResetDevToolsEnabled,
  parsePasswordResetTokensFromUrl,
} from "@/src/lib/passwordResetTokens";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useI18n } from "@/src/providers/LanguageProvider";

const CheckMail = () => {
  const { t } = useI18n();
  const showDevTools = isPasswordResetDevToolsEnabled();
  const [recoveryLink, setRecoveryLink] = useState("");
  const [parsing, setParsing] = useState(false);

  const openPastedRecoveryLink = () => {
    setParsing(true);
    const tokens = parsePasswordResetTokensFromUrl(recoveryLink);
    setParsing(false);

    if (!tokens) {
      Alert.alert(
        t("authPassword.devPasteInvalidTitle"),
        t("authPassword.devPasteInvalidMessage")
      );
      return;
    }

    router.replace({
      pathname: "/reset-password",
      params: tokens,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text
          accessibilityRole="header"
          style={[Typography.h3, styles.headline]}
        >
          {t("auth.passwordSent")}
        </Text>
        <View style={styles.card}>
          <Text style={[Typography.bodyLarge, styles.cardText]}>
            {t("auth.checkEmail")}
          </Text>
        </View>

        {showDevTools ? (
          <View style={styles.devCard}>
            <Text style={[Typography.bodySmall, styles.devTitle]}>
              {t("authPassword.devPasteTitle")}
            </Text>
            <Text style={[Typography.bodySmall, styles.devHint]}>
              {t("authPassword.devPasteHint")}
            </Text>
            <PrimaryOutlineTextField
              label={t("authPassword.devPasteLabel")}
              value={recoveryLink}
              onChangeText={setRecoveryLink}
              placeholder={t("authPassword.devPastePlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              containerStyle={styles.devField}
            />
            <PaddedLabelButton
              title={
                parsing
                  ? t("authPassword.devPasteOpening")
                  : t("authPassword.devPasteContinue")
              }
              horizontalPadding={24}
              verticalPadding={14}
              disabled={parsing || !recoveryLink.trim()}
              onPress={openPastedRecoveryLink}
              style={styles.devButton}
              textStyle={styles.devButtonLabel}
            />
          </View>
        ) : null}
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
  devCard: {
    width: "100%",
    maxWidth: 400,
    marginTop: responsiveMargin(24),
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(16),
    padding: responsivePadding(16),
  },
  devTitle: {
    color: primaryBlack,
    fontWeight: "600",
    marginBottom: responsiveMargin(8),
  },
  devHint: {
    color: primaryBlack,
    opacity: 0.8,
    marginBottom: responsiveMargin(12),
  },
  devField: {
    width: "100%",
    marginBottom: responsiveMargin(12),
  },
  devButton: {
    alignSelf: "center",
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
  devButtonLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
});
