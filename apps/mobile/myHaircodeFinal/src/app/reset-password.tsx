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
import React, { useEffect, useState } from "react";
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

/**
 * In development, you can open `/reset-password` with no query params to preview the layout.
 * Saving still requires a real link (tokens); in preview mode, Save shows an explanation.
 */
const DEV_PREVIEW_PASSWORD_RESET = __DEV__;

type AuthTokens = {
  access_token: string | null;
  refresh_token: string | null;
};

const PasswordReset = () => {
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

  const [passwordStrength, setPasswordStrength] = useState({
    strength: "Weak",
    color: "red",
    feedback: "Password must be at least 8 characters.",
  });

  const checkPasswordStrength = (password: string) => {
    let strength = "Weak";
    let color = "red";
    let feedback = "Password must be at least 8 characters.";

    const hasUppercase = /[A-ZÆØÅ]/.test(password);
    const hasLowercase = /[a-zæøå]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length >= 8) {
      feedback =
        "Add an uppercase letter, a number, and a special character for a stronger password.";
      strength = "Medium";
      color = "orange";
    }

    if (
      hasUppercase &&
      hasLowercase &&
      hasNumber &&
      hasSpecialChar &&
      password.length >= 8
    ) {
      feedback = "Strong password!";
      strength = "Strong";
      color = "green";
    }

    return { strength, color, feedback };
  };

  useEffect(() => {
    const extractTokens = async () => {
      let access_token: string | undefined;
      let refresh_token: string | undefined;
      const raw = urlParams as Record<string, string | string[] | undefined>;
      const a = raw.access_token;
      const r = raw.refresh_token;
      access_token =
        typeof a === "string" ? a : Array.isArray(a) ? a[0] : undefined;
      refresh_token =
        typeof r === "string" ? r : Array.isArray(r) ? r[0] : undefined;

      if (!access_token || !refresh_token) {
        const url = await Linking.getInitialURL();
        if (url) {
          const hash = url.split("#")[1];
          if (hash) {
            const params = new URLSearchParams(hash);
            access_token = params.get("access_token") || undefined;
            refresh_token = params.get("refresh_token") || undefined;
          }
        }
      }

      if (access_token && refresh_token) {
        setAuthTokens({ access_token, refresh_token });
        console.log("Tokens extracted successfully");
      } else {
        console.error("No valid tokens found in URL");
      }

      setTokensExtracted(true);
    };

    extractTokens();
  }, [urlParams]);

  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(checkPasswordStrength(newPassword));
    } else {
      setPasswordStrength({
        strength: "Weak",
        color: "red",
        feedback: "Password must be at least 8 characters.",
      });
    }

    setButtonDisabled(
      isLoading ||
        !newPassword ||
        !confirmPassword ||
        newPassword !== confirmPassword ||
        passwordStrength.strength === "Weak",
    );
  }, [
    newPassword,
    confirmPassword,
    passwordStrength.strength,
    isLoading,
  ]);

  const hasValidTokens = Boolean(
    authTokens.access_token && authTokens.refresh_token,
  );
  const isDevPreview = DEV_PREVIEW_PASSWORD_RESET && !hasValidTokens;

  const updatePassword = async () => {
    if (isLoading) return;

    if (isDevPreview) {
      Alert.alert(
        "Development preview",
        "Open this screen from the link in your reset email to save a new password. Layout-only in dev without tokens.",
      );
      return;
    }

    setIsLoading(true);
    setAttemptedSubmit(true);

    const errors: Record<string, string> = {};
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    if (passwordStrength.strength === "Weak") {
      errors.newPassword = "Password must be at least 8 characters.";
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
        error instanceof Error ? error.message : "Failed to update password";
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
            Invalid reset link
          </Text>
          <Text style={[Typography.bodyMedium, styles.invalidBody]}>
            This password reset link is invalid or has expired. Please request a
            new password reset.
          </Text>
          <PaddedLabelButton
            title="Go to Sign in"
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
                Dev preview — use the email link for a working reset.
              </Text>
            ) : null}

            <View style={styles.formBlock}>
              <Text
                accessibilityRole="header"
                style={[Typography.h2, styles.headline]}
              >
                New password
              </Text>

              <PrimaryOutlineTextField
                label="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                password
                placeholder="Enter new password"
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
                label="Repeat password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                password
                placeholder="Repeat password"
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
                title={isLoading ? "Saving…" : "Save"}
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
              title="Success"
              message="Your password has been updated successfully."
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
  /** Tighter gap between the two password fields */
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
});

export default PasswordReset;
