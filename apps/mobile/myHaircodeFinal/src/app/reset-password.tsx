import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import MyTextinput from "@/src/components/MyTextinput";
import MyButton from "@/src/components/MyButton";
import TopNav from "@/src/components/TopNav";
import { supabase } from "@/src/lib/supabase";
import { Colors } from "@/src/constants/Colors";
import { router } from "expo-router";
import CustomAlert from "@/src/components/CustomAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  moderateScale,
  scale,
  scalePercent,
  verticalScale,
} from "../utils/responsive";
import LoadingScreen from "./(setup)/LoadingScreen";
import { useAuth } from "@/src/providers/AuthProvider"; 

const PasswordReset = () => {
  const urlParams = useLocalSearchParams();
  const [tokensExtracted, setTokensExtracted] = useState(false);
  const [authTokens, setAuthTokens] = useState({ access_token: null, refresh_token: null });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [errorMessages, setErrorMessages] = useState({});
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const { signOut } = useAuth();

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
      let { access_token, refresh_token } = urlParams as any;

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
      isLoading || // Disable if loading
      !newPassword ||
      !confirmPassword ||
      newPassword !== confirmPassword ||
      passwordStrength.strength === "Weak"
    );
  }, [newPassword, confirmPassword, passwordStrength.strength, isLoading]);


const updatePassword = async () => {
  if (isLoading) return;
  
  setIsLoading(true);
  setAttemptedSubmit(true);

  const errors = {};
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
    const { error: sessionError } = await supabase.auth.setSession(authTokens);
    if (sessionError) throw sessionError;

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;

    // ✅ Show success alert immediately
    setAlertVisible(true);
    
    // ✅ Sign out and navigate after brief delay
    setTimeout(async () => {
      await supabase.auth.signOut(); // Direct sign out, don't use signOut() function
      router.replace("/SignIn");
    }, 2000);

  } catch (error) {
    console.error("Error updating password:", error);
    setErrorMessages({ newPassword: error.message || "Failed to update password" });
    setIsLoading(false);
  }
};

  if (!tokensExtracted) {
    return <LoadingScreen />;
  }

  if (!authTokens.access_token || !authTokens.refresh_token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Invalid Reset Link</Text>
          <Text style={styles.errorText}>
            This password reset link is invalid or has expired. Please request a new password reset.
          </Text>
          <MyButton
            style={styles.button}
            text="Go to Sign In"
            onPress={() => router.replace("/SignIn")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.contentContainer}>
            <TopNav title="Reset Password" />
            <View style={styles.subContainer}>
              <MyTextinput
                placeholder="Enter new password"
                value={newPassword}
                handleChangeText={setNewPassword}
                title="Password"
                containerStyle={[
                  styles.input,
                  attemptedSubmit && errorMessages.newPassword
                    ? styles.inputInvalid
                    : attemptedSubmit && newPassword
                    ? styles.inputValid
                    : null,
                ]}
              />
              {errorMessages.newPassword && (
                <Text style={styles.errorMessage}>
                  {errorMessages.newPassword}
                </Text>
              )}

              {/* 🔹 Strength meter */}
              {newPassword !== "" && (
                <View style={styles.passwordStrengthContainer}>
                  <View
                    style={[
                      styles.passwordStrengthBar,
                      { backgroundColor: passwordStrength.color },
                    ]}
                  />
                  <Text style={{ color: passwordStrength.color }}>
                    {passwordStrength.strength} - {passwordStrength.feedback}
                  </Text>
                </View>
              )}

              <MyTextinput
                placeholder="Confirm new password"
                value={confirmPassword}
                handleChangeText={setConfirmPassword}
                title="Confirm Password"
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
                <Text style={styles.errorMessage}>
                  {errorMessages.confirmPassword}
                </Text>
              )}
            </View>

            <MyButton
              style={styles.button}
              text={isLoading ? "Updating..." : "Save"}
              onPress={updatePassword}
              disabled={buttonDisabled}
            />

            <CustomAlert
              visible={alertVisible}
              title="Success"
              message="Your password has been updated successfully."
              onClose={() => {
                setAlertVisible(false);
                router.replace("/SignIn");
              }}
            />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  subContainer: { paddingVertical: scalePercent(5) },
  input: {
    backgroundColor: Colors.light.yellowish,
    height: scale(50),
    borderWidth: scale(1),
    borderColor: "transparent",
    marginVertical: verticalScale(10),
  },
  inputValid: { borderColor: "green", borderWidth: scale(1) },
  inputInvalid: { borderColor: "red", borderWidth: scale(1) },
  errorMessage: {
    color: "red",
    fontSize: moderateScale(14),
    marginTop: scale(5),
  },
  keyboardContainer: { flex: 1, padding: scale(20) },
  button: { width: scalePercent(90), alignSelf: "center" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: scale(20),
  },
  errorTitle: {
    fontSize: moderateScale(24),
    fontWeight: "bold",
    color: "red",
    marginBottom: verticalScale(10),
    textAlign: "center",
  },
  errorText: {
    fontSize: moderateScale(16),
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: verticalScale(20),
  },
  passwordStrengthContainer: {
    marginTop: verticalScale(10),
    alignItems: "center",
  },
  passwordStrengthBar: {
    width: scalePercent(70),
    height: verticalScale(10),
    borderRadius: scale(5),
    marginBottom: verticalScale(5),
  },
});

export default PasswordReset;