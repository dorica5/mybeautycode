/* eslint-disable react/react-in-jsx-scope */
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { PrimaryOutlineTextField } from "@/src/components/PrimaryOutlineTextField";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { api } from "@/src/lib/apiClient";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { NavBackRow } from "@/src/components/NavBackRow";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "@/src/providers/LanguageProvider";

const Reset = () => {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resetPassword = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      await api.post("/api/auth/forgot-password", { email: email.trim() });
      router.replace("/CheckMail");
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === "invalid_email") {
        setErrorMessage(t("auth.invalidEmail"));
      } else {
        setErrorMessage(err.message || t("auth.resetRequestFailed"));
      }
      console.error("Reset password error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <NavBackRow
            accessibilityLabel={t("common.back")}
            onPress={() => router.back()}
            style={styles.backRow}
            hitSlop={12}
          />

          <KeyboardAvoidingView
            style={styles.keyboard}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : responsiveScale(20)}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formBlock}>
                <Text
                  accessibilityRole="header"
                  style={[Typography.h3, styles.textOnGreen, styles.headline]}
                >
                  {t("auth.forgotPasswordTitle")}
                </Text>

                <PrimaryOutlineTextField
                  label={t("auth.email")}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("auth.email")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  containerStyle={styles.emailFieldSpacing}
                />

                {errorMessage ? (
                  <Text style={styles.errorMessage}>{errorMessage}</Text>
                ) : null}

                <PaddedLabelButton
                  title={loading ? t("auth.sending") : t("auth.sendNewPassword")}
                  horizontalPadding={32}
                  verticalPadding={16}
                  disabled={loading || !email.trim()}
                  onPress={resetPassword}
                  style={styles.primaryButton}
                  textStyle={styles.primaryButtonLabel}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default Reset;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  container: {
    flex: 1,
    backgroundColor: primaryGreen,
    paddingHorizontal: responsivePadding(24),
  },
  backRow: {
    alignSelf: "flex-start",
    position: "absolute",
    left: responsiveMargin(16),
    top: responsiveMargin(8),
    zIndex: 2,
    paddingVertical: responsiveMargin(4),
  },
  keyboard: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    paddingTop: responsiveMargin(52),
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: responsiveMargin(220),
    paddingBottom: responsiveMargin(32),
  },
  formBlock: {
    alignItems: "center",
    width: "100%",
  },
  textOnGreen: {
    color: primaryBlack,
    textAlign: "center",
  },
  headline: {
    marginBottom: responsiveMargin(40),
  },
  emailFieldSpacing: {
    marginBottom: responsiveMargin(36),
    width: "100%",
  },
  primaryButton: {
    alignSelf: "center",
    marginTop: responsiveMargin(28),
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
  primaryButtonLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
  errorMessage: {
    ...Typography.bodySmall,
    color: "#B00020",
    textAlign: "center",
    marginBottom: responsiveMargin(8),
    maxWidth: 320,
  },
});
