import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import MyTextinput from "@/src/components/MyTextinput";
import MyButton from "@/src/components/MyButton";
import TopNav from "@/src/components/TopNav";
import { supabase } from "@/src/lib/supabase";
import { Colors } from "@/src/constants/Colors";
import { Href, router } from "expo-router";
import CustomAlert from "@/src/components/CustomAlert";
import { ResponsiveText } from "@/src/components/ResponsiveText";
import {
  moderateScale,
  responsiveFontSize,
  scale,
  scalePercent,
  verticalScale,
} from "@/src/utils/responsive";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

type ErrorMessages = {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    strength: "Weak",
    color: "red",
    feedback: "Password must be at least 8 characters.",
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
      (passwordStrength.strength === "Medium" ||
        passwordStrength.strength === "Strong")
    );
  };

  const resetPassword = () => router.push("../../Reset");

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

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    if (value) {
      setPasswordStrength(checkPasswordStrength(value));
    } else {
      setPasswordStrength({
        strength: "Weak",
        color: "red",
        feedback: "Password must be at least 8 characters.",
      });
    }
  };

  const updatePassword = async () => {
    setAttemptedSubmit(true);
    setIsUpdating(true);
    console.log("Updating password...");
    const errors: ErrorMessages = {};

    setErrorMessages({});

    try {
      if (newPassword !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match.";
      }

      if (passwordStrength.strength === "Weak") {
        errors.newPassword = "Password must be at least 8 characters.";
      }

      if (Object.keys(errors).length > 0) {
        setErrorMessages(errors);
        setIsUpdating(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email;

      if (!email) {
        errors.oldPassword = "Error verifying session. Please try again.";
        setErrorMessages(errors);
        setIsUpdating(false);
        return;
      }

      const tempClient = supabase.auth.admin;

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
        errors.oldPassword = "Incorrect old password.";
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
        oldPassword: "An unexpected error occurred. Please try again.",
      });
      setIsUpdating(false);
    }
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View>
                <TopNav title="Change Password" />
                <View style={styles.subContainer}>
                  <MyTextinput
                    placeholder="Enter old password"
                    value={oldPassword}
                    handleChangeText={(e) => setOldPassword(e)}
                    title="Password"
                    containerStyle={[
                      styles.input,
                      attemptedSubmit && errorMessages.oldPassword
                        ? styles.inputInvalid
                        : attemptedSubmit && oldPassword
                        ? styles.inputValid
                        : null,
                    ]}
                  />
                  {errorMessages.oldPassword && (
                    <ResponsiveText size={14} tabletSize={12} style={styles.errorMessage}>
                      {errorMessages.oldPassword}
                    </ResponsiveText>
                  )}

                  <View style={styles.textContainer}>
                    <Text style={[styles.textStyle, {fontSize: responsiveFontSize(16, 12)}]}>
                      Don't remember your password?
                    </Text>
                    <Pressable onPress={resetPassword}>
                      <Text style={[styles.signInText, {fontSize: responsiveFontSize(16, 12)}]}>Reset</Text>
                    </Pressable>
                  </View>

                  <MyTextinput
                    placeholder="Enter new password"
                    value={newPassword}
                    handleChangeText={handlePasswordChange}
                    title="Password"
                    containerStyle={[
                      styles.input,
                      attemptedSubmit && errorMessages.newPassword
                        ? styles.inputInvalid
                        : attemptedSubmit &&
                          newPassword &&
                          passwordStrength.strength !== "Weak"
                        ? styles.inputValid
                        : null,
                    ]}
                  />
                  {newPassword !== "" && (
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
                            fontSize: responsiveFontSize(14, 10)
                          },
                        ]}
                      >
                        {passwordStrength.strength} -{" "}
                        {passwordStrength.feedback}
                      </Text>
                    </View>
                  )}
                  {errorMessages.newPassword && (
                    <ResponsiveText size={14} tabletSize={12} style={styles.errorMessage}>
                      {errorMessages.newPassword}
                    </ResponsiveText>
                  )}

                  <MyTextinput
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    handleChangeText={(e) => setConfirmPassword(e)}
                    title="Confirm New Password"
                    secureTextEntry
                    containerStyle={[
                      styles.input,
                      attemptedSubmit && errorMessages.confirmPassword
                        ? styles.inputInvalid
                        : attemptedSubmit && confirmPassword
                        ? styles.inputValid
                        : null,
                    ]}
                  />
                  {errorMessages.confirmPassword && (
                    <ResponsiveText size={14} tabletSize={12} style={styles.errorMessage}>
                      {errorMessages.confirmPassword}
                    </ResponsiveText>
                  )}
                </View>

                <MyButton
                  style={[
                    styles.button,
                    isFormValid()
                      ? styles.buttonEnabled
                      : styles.buttonDisabled,
                  ]}
                  text={isUpdating ? "Updating Password..." : "Update Password"}
                  textSize={18}
                  textTabletSize={14}
                  onPress={updatePassword}
                  disabled={!isFormValid() || isUpdating}
                  textStyle={
                    isFormValid() ? styles.textEnabled : styles.textDisabled
                  }
                />

                <CustomAlert
                  visible={alertVisible}
                  title="Success"
                  message="Your password has been updated successfully."
                  onClose={() => {
                    setAlertVisible(false);
                    router.replace("/(hairdresser)/home" as Href);
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </>
  );
};

export default ChangePassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subContainer: {
    paddingVertical: scalePercent(4),
  },
  textContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: scalePercent(1),
    marginBottom: scale(20),
  },
  textStyle: {
    fontFamily: "Inter-Regular",
    lineHeight: moderateScale(24),
  },
  signInText: {
    fontFamily: "Inter-Bold",
    lineHeight: moderateScale(24),
    marginLeft: scale(5),
  },
  passwordStrengthContainer: {
    marginTop: scale(10),
    alignItems: "center",
  },
  passwordStrengthBar: {
    width: scalePercent(72),
    height: verticalScale(10),
    borderRadius: 5,
    marginBottom: scale(5),
  },
  passwordStrengthText: {
    fontFamily: "Inter-Regular",
    textAlign: "center",
  },
  input: {
    backgroundColor: Colors.light.yellowish,
    height: scalePercent(13),
    borderWidth: scale(1),
    borderColor: "transparent",
  },
  inputValid: {
    borderColor: "green",
    borderWidth: scale(1),
  },
  inputInvalid: {
    borderColor: "red",
    borderWidth: scale(1),
  },
  errorMessage: {
    color: "red",
    marginTop: scale(5),
  },
  keyboardContainer: {
    flex: 1,
    padding: scale(20),
  },
  button: {
    width: scalePercent(90),
    alignSelf: "center",
  },
  buttonEnabled: {
    backgroundColor: Colors.dark.yellowish,
    borderWidth: 2,
    borderColor: Colors.dark.warmGreen,
  },
  buttonDisabled: {
    backgroundColor: Colors.light.yellowish,
  },
  textEnabled: {
    color: Colors.dark.dark,
  },
  textDisabled: {
    opacity: 0.5,
  },
});