/* eslint-disable react/react-in-jsx-scope */
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { PrimaryOutlineTextField } from "@/src/components/PrimaryOutlineTextField";
import CustomAlert from "@/src/components/CustomAlert";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { supabase } from "@/src/lib/supabase";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
import LoadingScreen from "./(setup)/LoadingScreen";
import { useI18n } from "@/src/providers/LanguageProvider";
import {
  isPasswordResetDevToolsEnabled,
  parsePasswordResetTokensFromUrl,
} from "@/src/lib/passwordResetTokens";

/**
 * In development, you can open `/reset-password` with no query params to preview the layout.
 * Saving still requires a real link (tokens); in preview mode, Save shows an explanation.
 */
const DEV_PREVIEW_PASSWORD_RESET = __DEV__;

type AuthTokens = {
  access_token: string | null;
  refresh_token: string | null;
};

type PasswordStrengthLevel = "weak" | "medium" | "strong";

const PasswordReset = () => {
  const { t } = useI18n();
  const urlParams = useLocalSearchParams();
  const [tokensExtracted, setTokensExtracted] = useState(false);
  const [authTokens, setAuthTokens] = useState<AuthTokens>({
    access_token: null,
    refresh_token: null,
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>(
    {},
  );
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryLink, setRecoveryLink] = useState("");

  const showDevTools = isPasswordResetDevToolsEnabled();
  const tokensResolvedRef = useRef(false);

  const paramAccessToken = useMemo(() => {
    const raw = urlParams as Record<string, string | string[] | undefined>;
    const a = raw.access_token;
    return typeof a === "string" ? a : Array.isArray(a) ? a[0] : undefined;
  }, [urlParams.access_token]);

  const paramRefreshToken = useMemo(() => {
    const raw = urlParams as Record<string, string | string[] | undefined>;
    const r = raw.refresh_token;
    return typeof r === "string" ? r : Array.isArray(r) ? r[0] : undefined;
  }, [urlParams.refresh_token]);

  const applyTokens = useCallback((access_token?: string, refresh_token?: string) => {
    if (!access_token || !refresh_token) return;
    setAuthTokens((prev) => {
      if (
        prev.access_token === access_token &&
        prev.refresh_token === refresh_token
      ) {
        return prev;
      }
      return { access_token, refresh_token };
    });
  }, []);

  useEffect(() => {
    if (tokensResolvedRef.current) return;

    const resolveTokens = async () => {
      if (paramAccessToken && paramRefreshToken) {
        applyTokens(paramAccessToken, paramRefreshToken);
        tokensResolvedRef.current = true;
        setTokensExtracted(true);
        return;
      }

      const url = await Linking.getInitialURL();
      if (url) {
        const parsed = parsePasswordResetTokensFromUrl(url);
        if (parsed) {
          applyTokens(parsed.access_token, parsed.refresh_token);
        }
      }

      tokensResolvedRef.current = true;
      setTokensExtracted(true);
    };

    void resolveTokens();
  }, [paramAccessToken, paramRefreshToken, applyTokens]);

  useEffect(() => {
    const onUrl = (event: { url: string }) => {
      const parsed = parsePasswordResetTokensFromUrl(event.url);
      if (parsed) {
        applyTokens(parsed.access_token, parsed.refresh_token);
        setTokensExtracted(true);
      }
    };

    const sub = Linking.addEventListener("url", onUrl);
    return () => sub.remove();
  }, [applyTokens]);

  const [passwordStrength, setPasswordStrength] = useState<{
    level: PasswordStrengthLevel;
    color: string;
    feedback: string;
  }>({
    level: "weak",
    color: "red",
    feedback: "",
  });

  const checkPasswordStrength = useCallback(
    (password: string) => {
      let level: PasswordStrengthLevel = "weak";
      let color = "red";
      let feedback = t("authPassword.passwordMinLength");

      const hasUppercase = /[A-ZÆØÅ]/.test(password);
      const hasLowercase = /[a-zæøå]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (password.length >= 8) {
        feedback = t("authPassword.passwordStrengthHint");
        level = "medium";
        color = "orange";
      }

      if (
        hasUppercase &&
        hasLowercase &&
        hasNumber &&
        hasSpecialChar &&
        password.length >= 8
      ) {
        feedback = t("authPassword.passwordStrongReady");
        level = "strong";
        color = "green";
      }

      return { level, color, feedback };
    },
    [t]
  );

  useEffect(() => {
    const strength = newPassword
      ? checkPasswordStrength(newPassword)
      : {
          level: "weak" as PasswordStrengthLevel,
          color: "red",
          feedback: t("authPassword.passwordMinLength"),
        };
    setPasswordStrength(strength);
    setButtonDisabled(
      isLoading ||
        !newPassword ||
        !confirmPassword ||
        newPassword !== confirmPassword ||
        strength.level === "weak",
    );
  }, [newPassword, confirmPassword, isLoading, checkPasswordStrength, t]);

  const hasValidTokens = Boolean(
    authTokens.access_token && authTokens.refresh_token,
  );
  const isDevPreview = DEV_PREVIEW_PASSWORD_RESET && !hasValidTokens;

  const applyPastedRecoveryLink = () => {
    const tokens = parsePasswordResetTokensFromUrl(recoveryLink);
    if (!tokens) {
      Alert.alert(
        t("authPassword.devPasteInvalidTitle"),
        t("authPassword.devPasteInvalidMessage")
      );
      return;
    }
    setAuthTokens(tokens);
    setTokensExtracted(true);
  };

  const updatePassword = async () => {
    if (isLoading) return;

    if (isDevPreview) {
      Alert.alert(
        t("authPassword.devPreviewTitle"),
        t("authPassword.devPreviewMessage")
      );
      return;
    }

    setIsLoading(true);
    setAttemptedSubmit(true);

    const errors: Record<string, string> = {};
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = t("authPassword.passwordsNoMatch");
    }
    if (passwordStrength.level === "weak") {
      errors.newPassword = t("authPassword.passwordMinLength");
    }
    if (Object.keys(errors).length > 0) {
      setErrorMessages(errors);
      setIsLoading(false);
      return;
    }

    try {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: authTokens.access_token!,
        refresh_token: authTokens.refresh_token!,
      });
      if (sessionError) throw sessionError;

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setAlertVisible(true);

      setTimeout(async () => {
        await supabase.auth.signOut();
        router.replace("/SignIn");
      }, 2000);
    } catch (error: unknown) {
      console.error("Error updating password:", error);
      const message =
        error instanceof Error
          ? error.message
          : t("authPassword.failedUpdatePassword");
      setErrorMessages({ newPassword: message });
      setIsLoading(false);
    }
  };

  if (!tokensExtracted) {
    return <LoadingScreen />;
  }

  if (!hasValidTokens && !isDevPreview) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.invalidWrap}>
          <Text style={[Typography.h3, styles.invalidTitle]}>
            {t("authPassword.invalidResetLink")}
          </Text>
          <Text style={[Typography.bodyMedium, styles.invalidBody]}>
            {t("authPassword.invalidResetLinkBody")}
          </Text>
          {showDevTools ? (
            <View style={styles.devPasteBlock}>
              <Text style={[Typography.bodySmall, styles.devPasteHint]}>
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
                containerStyle={styles.devPasteField}
              />
              <PaddedLabelButton
                title={t("authPassword.devPasteContinue")}
                horizontalPadding={24}
                verticalPadding={14}
                disabled={!recoveryLink.trim()}
                onPress={applyPastedRecoveryLink}
                style={styles.primaryButton}
                textStyle={styles.primaryButtonLabel}
              />
            </View>
          ) : null}
          <PaddedLabelButton
            title={t("authPassword.goToSignIn")}
            horizontalPadding={32}
            verticalPadding={16}
            onPress={() => router.replace("/SignIn")}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonLabel}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? 0 : responsiveScale(20)
        }
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isDevPreview ? (
              <Text style={styles.devBanner}>
                {t("authPassword.devPreviewBanner")}
              </Text>
            ) : null}

            <View style={styles.formBlock}>
              <Text
                accessibilityRole="header"
                style={[Typography.h2, styles.headline]}
              >
                {t("authPassword.newPasswordHeadline")}
              </Text>

              <PrimaryOutlineTextField
                label={t("authPassword.enterNewPassword")}
                value={newPassword}
                onChangeText={setNewPassword}
                password
                placeholder={t("authPassword.enterNewPassword")}
                autoCapitalize="none"
                autoComplete="password"
                containerStyle={styles.firstFieldSpacing}
              />
              {attemptedSubmit && errorMessages.newPassword ? (
                <Text style={styles.fieldError}>
                  {errorMessages.newPassword}
                </Text>
              ) : null}

              <PrimaryOutlineTextField
                label={t("authPassword.repeatPassword")}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                password
                placeholder={t("authPassword.repeatPassword")}
                autoCapitalize="none"
                autoComplete="password"
                containerStyle={styles.secondFieldSpacing}
              />
              {attemptedSubmit && errorMessages.confirmPassword ? (
                <Text style={styles.fieldError}>
                  {errorMessages.confirmPassword}
                </Text>
              ) : null}

              <PaddedLabelButton
                title={isLoading ? t("common.saving") : t("common.save")}
                horizontalPadding={32}
                verticalPadding={16}
                disabled={buttonDisabled}
                onPress={updatePassword}
                style={styles.primaryButton}
                textStyle={styles.primaryButtonLabel}
              />
            </View>

            <CustomAlert
              visible={alertVisible}
              title={t("common.success")}
              message={t("authPassword.passwordUpdated")}
              onClose={() => {
                setAlertVisible(false);
                router.replace("/SignIn");
              }}
            />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: responsivePadding(24),
    paddingVertical: responsiveMargin(32),
  },
  devBanner: {
    ...Typography.bodySmall,
    color: primaryBlack,
    textAlign: "center",
    opacity: 0.85,
    marginBottom: responsiveMargin(16),
  },
  formBlock: {
    alignItems: "center",
    width: "100%",
  },
  headline: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(32),
  },
  firstFieldSpacing: {
    marginBottom: responsiveMargin(16),
    width: "100%",
  },
  secondFieldSpacing: {
    marginBottom: responsiveMargin(28),
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
  fieldError: {
    ...Typography.bodySmall,
    color: "#B00020",
    textAlign: "center",
    marginTop: -responsiveMargin(12),
    marginBottom: responsiveMargin(8),
    maxWidth: 320,
    alignSelf: "center",
  },
  invalidWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: responsivePadding(24),
  },
  invalidTitle: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(16),
  },
  invalidBody: {
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(28),
  },
  devPasteBlock: {
    width: "100%",
    marginBottom: responsiveMargin(20),
  },
  devPasteHint: {
    color: primaryBlack,
    textAlign: "center",
    opacity: 0.85,
    marginBottom: responsiveMargin(12),
  },
  devPasteField: {
    width: "100%",
    marginBottom: responsiveMargin(12),
  },
});

export default PasswordReset;
