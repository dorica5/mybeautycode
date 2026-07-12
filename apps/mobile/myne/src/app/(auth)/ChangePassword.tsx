import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import TopNav from "@/src/components/TopNav";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { supabase } from "@/src/lib/supabase";
import { primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { Href, router } from "expo-router";
import CustomAlert from "@/src/components/CustomAlert";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import { PrimaryOutlineTextField } from "@/src/components/PrimaryOutlineTextField";
import {
  MintProfileScreenShell,
  mintProfileScrollContent,
} from "@/src/components/MintProfileScreenShell";
import { useI18n } from "@/src/providers/LanguageProvider";
import {
  moderateScale,
  responsiveFontSize,
  responsiveMargin,
  responsiveScale,
  scale,
  verticalScale,
} from "@/src/utils/responsive";

type ErrorMessages = {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

const ChangePassword = () => {
  const { t } = useI18n();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    strength: t("authPassword.passwordWeak"),
    color: "red",
    feedback: t("authPassword.passwordMinLength"),
  });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [errorMessages, setErrorMessages] = useState<ErrorMessages>({});
  const [alertVisible, setAlertVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isFormValid = () => {
    return (
      oldPassword.length > 0 &&
      newPassword.length >= 8 &&
      confirmPassword.length > 0 &&
      (passwordStrength.strength === t("authPassword.passwordMedium") ||
        passwordStrength.strength === t("authPassword.passwordStrong"))
    );
  };

  const resetPassword = () => router.push("../../Reset");

  const checkPasswordStrength = (password: string) => {
    let strength = t("authPassword.passwordWeak");
    let color = "red";
    let feedback = t("authPassword.passwordMinLength");

    const hasUppercase = /[A-ZÆØÅ]/.test(password);
    const hasLowercase = /[a-zæøå]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length >= 8) {
      feedback = t("authPassword.passwordStrengthHint");
      strength = t("authPassword.passwordMedium");
      color = "orange";
    }

    if (
      hasUppercase &&
      hasLowercase &&
      hasNumber &&
      hasSpecialChar &&
      password.length >= 8
    ) {
      feedback = t("auth.strongPassword");
      strength = t("authPassword.passwordStrong");
      color = "green";
    }

    return { strength, color, feedback };
  };

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    if (value) {
      setPasswordStrength(checkPasswordStrength(value));
    } else {
      setPasswordStrength({
        strength: t("authPassword.passwordWeak"),
        color: "red",
        feedback: t("authPassword.passwordMinLength"),
      });
    }
  };

  const updatePassword = async () => {
    setAttemptedSubmit(true);
    setIsUpdating(true);
    const errors: ErrorMessages = {};

    setErrorMessages({});

    try {
      if (newPassword !== confirmPassword) {
        errors.confirmPassword = t("authPassword.passwordsNoMatch");
      }

      if (passwordStrength.strength === t("authPassword.passwordWeak")) {
        errors.newPassword = t("authPassword.passwordMinLength");
      }

      if (Object.keys(errors).length > 0) {
        setErrorMessages(errors);
        setIsUpdating(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email;

      if (!email) {
        errors.oldPassword = t("authPassword.sessionVerifyFailed");
        setErrorMessages(errors);
        setIsUpdating(false);
        return;
      }

      const credentials = { email, password: oldPassword };

      const verifyResponse = await fetch(
        `${supabase.supabaseUrl}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabase.supabaseKey,
          },
          body: JSON.stringify(credentials),
        }
      );

      if (!verifyResponse.ok) {
        errors.oldPassword = t("authPassword.incorrectOldPassword");
        setErrorMessages(errors);
        setIsUpdating(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("Update password error:", error);
        errors.newPassword = error.message;
        setErrorMessages(errors);
        setIsUpdating(false);
        return;
      }

      setAlertVisible(true);
      setIsUpdating(false);
    } catch (error) {
      console.error("Error updating password:", error);
      setErrorMessages({
        oldPassword: t("authPassword.unexpectedPasswordError"),
      });
      setIsUpdating(false);
    }
  };

  return (
    <MintProfileScreenShell>
      <TopNav title={t("profile.changePassword")} />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={mintProfileScrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <PrimaryOutlineTextField
            label={t("authPassword.currentPassword")}
            placeholder={t("authPassword.enterOldPassword")}
            value={oldPassword}
            onChangeText={setOldPassword}
            password
            autoCapitalize="none"
            textContentType="password"
          />
          {errorMessages.oldPassword ? (
            <ResponsiveText size={14} tabletSize={12} style={styles.errorMessage}>
              {errorMessages.oldPassword}
            </ResponsiveText>
          ) : null}

          <View style={styles.textContainer}>
            <Text
              style={[
                Typography.bodyMedium,
                styles.mintText,
                { fontSize: responsiveFontSize(16, 12) },
              ]}
            >
              {t("auth.forgotPassword")}
            </Text>
            <Pressable onPress={resetPassword}>
              <Text
                style={[
                  Typography.bodyMedium,
                  styles.resetLink,
                  { fontSize: responsiveFontSize(16, 12) },
                ]}
              >
                {t("authPassword.reset")}
              </Text>
            </Pressable>
          </View>

          <PrimaryOutlineTextField
            label={t("authPassword.newPassword")}
            placeholder={t("authPassword.enterNewPassword")}
            value={newPassword}
            onChangeText={handlePasswordChange}
            password
            autoCapitalize="none"
            textContentType="newPassword"
          />
          {newPassword !== "" ? (
            <View style={styles.passwordStrengthContainer}>
              <View
                style={[
                  styles.passwordStrengthBar,
                  { backgroundColor: passwordStrength.color },
                ]}
              />
              <Text
                style={[
                  styles.passwordStrengthText,
                  {
                    color: passwordStrength.color,
                    fontSize: responsiveFontSize(14, 10),
                  },
                ]}
              >
                {passwordStrength.strength} — {passwordStrength.feedback}
              </Text>
            </View>
          ) : null}
          {errorMessages.newPassword ? (
            <ResponsiveText size={14} tabletSize={12} style={styles.errorMessage}>
              {errorMessages.newPassword}
            </ResponsiveText>
          ) : null}

          <PrimaryOutlineTextField
            label={t("authPassword.confirmNewPassword")}
            placeholder={t("authPassword.confirmNewPassword")}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            password
            autoCapitalize="none"
            textContentType="newPassword"
          />
          {errorMessages.confirmPassword ? (
            <ResponsiveText size={14} tabletSize={12} style={styles.errorMessage}>
              {errorMessages.confirmPassword}
            </ResponsiveText>
          ) : null}

          <PaddedLabelButton
            title={isUpdating ? t("authPassword.updatingPassword") : t("authPassword.updatePassword")}
            horizontalPadding={32}
            verticalPadding={16}
            onPress={updatePassword}
            disabled={!isFormValid() || isUpdating}
            style={styles.primaryButton}
            textStyle={styles.primaryButtonLabel}
          />

          <CustomAlert
            visible={alertVisible}
            title={t("common.success")}
            message={t("authPassword.passwordUpdated")}
            onClose={() => {
              setAlertVisible(false);
              router.replace("/(professional)/home" as Href);
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </MintProfileScreenShell>
  );
};

export default ChangePassword;

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  textContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: scale(4),
    marginBottom: scale(16),
    gap: scale(4),
  },
  mintText: {
    color: primaryBlack,
  },
  resetLink: {
    color: primaryBlack,
    fontFamily: "Inter-Bold",
    lineHeight: moderateScale(24),
    textDecorationLine: "underline",
  },
  passwordStrengthContainer: {
    marginTop: scale(10),
    alignItems: "center",
  },
  passwordStrengthBar: {
    width: "100%",
    maxWidth: scale(280),
    height: verticalScale(10),
    borderRadius: 5,
    marginBottom: scale(5),
  },
  passwordStrengthText: {
    fontFamily: "Inter-Regular",
    textAlign: "center",
  },
  errorMessage: {
    color: "#C62828",
    marginTop: scale(5),
  },
  primaryButton: {
    alignSelf: "center",
    marginTop: responsiveMargin(8),
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
  primaryButtonLabel: {
    color: primaryWhite,
    textAlign: "center",
  },
});