/* eslint-disable react/react-in-jsx-scope */
import MyButton from "@/src/components/MyButton";
import MyTextinput from "@/src/components/MyTextinput";
import { Colors } from "@/src/constants/Colors";
import { supabase } from "@/src/lib/supabase";
import { router } from "expo-router";
import { CaretLeft } from "phosphor-react-native";
import Logo from "../../../assets/myHaircode_full_logo.svg";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  responsiveScale,
  scalePercent,
  responsiveFontSize,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { usePostHog } from "posthog-react-native";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    strength: "Weak",
    color: "red",
    feedback: "Password must be at least 8 characters.",
  });
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const posthog = usePostHog();

  const goToSignIn = () => router.push("../../SignIn");

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setIsEmailValid(validateEmail(value));
  };

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
    setPassword(value);
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

  const isFormValid = () =>
    isEmailValid &&
    (passwordStrength.strength === "Medium" ||
      passwordStrength.strength === "Strong");

  async function signUpWithEmail() {
    if (!isFormValid()) {
      setErrorMessage("Please enter a valid email and strong password.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setErrorMessage(error.message);
      } else {
        await AsyncStorage.setItem("freshSignup", "true");
        posthog.capture("Signed Up");

        if (data?.user) {
          posthog.identify(data.user.id, {
            email: data.user.email ?? null,
          });
        }

        console.log("Signup successful, AuthProvider will handle navigation");
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred. Please try again.");
      console.error("SignUp error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={[
        Colors.dark.warmGreen,
        Colors.dark.warmGreen, //greenish
        Colors.dark.yellowish, //purpleish
        //brownish
      ]}
      style={{ flex: 1 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="dark" backgroundColor={Colors.dark.warmGreen} />
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={
              Platform.OS === "ios" ? 0 : responsiveScale(20)
            }
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable onPress={() => router.back()}>
                <CaretLeft
                  size={responsiveScale(30)}
                  color={Colors.dark.dark}
                />
              </Pressable>

              <View style={styles.logoContainer}>
                <Logo
                  width={responsiveScale(180, 240)}
                  height={responsiveScale(240, 320)}
                />
              </View>

              <Text style={styles.title}>Sign Up</Text>

              <MyTextinput
                placeholder="Email"
                value={email}
                handleChangeText={handleEmailChange}
                title="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  email === ""
                    ? styles.inputNeutral
                    : isEmailValid
                    ? styles.inputValid
                    : styles.inputInvalid,
                ]}
              />

              <MyTextinput
                placeholder="Password"
                value={password}
                handleChangeText={handlePasswordChange}
                title="Password"
                style={[
                  password === ""
                    ? styles.inputNeutral
                    : passwordStrength.strength === "Weak"
                    ? styles.inputInvalid
                    : styles.inputValid,
                ]}
              />

              {password !== "" && (
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
                      { color: passwordStrength.color },
                    ]}
                  >
                    {passwordStrength.strength} - {passwordStrength.feedback}
                  </Text>
                </View>
              )}

              {errorMessage ? (
                <Text style={styles.errorMessage}>{errorMessage}</Text>
              ) : null}

              <View style={{ marginTop: responsiveScale(30) }}>
                <MyButton
                  text={loading ? "Creating account..." : "Create account"}
                  margin={false}
                  disabled={loading || !isFormValid()}
                  onPress={signUpWithEmail}
                  style={styles.btn}
                  textSize={18}
                  textTabletSize={14}
                />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.textStyle}>Already have an account? </Text>
                <Pressable onPress={goToSignIn}>
                  <Text style={styles.signInText}>Sign in</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    padding: responsiveScale(20),
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "flex-start",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: scalePercent(6),
  },
  title: {
    fontFamily: "Inter-Bold",
    fontSize: responsiveFontSize(20, 16),
    marginTop: scalePercent(15),
  },
  textContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: responsiveScale(30),
  },
  textStyle: {
    fontFamily: "Inter-Regular",
    lineHeight: responsiveFontSize(24),
    fontSize: responsiveFontSize(18, 12),
  },
  signInText: {
    fontFamily: "Inter-Bold",
    fontSize: responsiveFontSize(20, 14),
    alignSelf: "baseline",
    lineHeight: responsiveFontSize(24),
  },
  btn: {
    backgroundColor: Colors.dark.yellowish,
    borderColor: Colors.dark.warmGreen,
    borderWidth: responsiveScale(2),
    shadowColor: "rgba(0, 0, 0)",
    shadowOffset: { width: 0, height: responsiveScale(5) },
    shadowOpacity: 0.3,
    shadowRadius: responsiveScale(5),
    elevation: 3,
  },
  errorMessage: {
    color: "red",
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(14),
    textAlign: "center",
    marginTop: responsiveScale(10),
  },
  passwordStrengthContainer: {
    marginTop: responsiveScale(10),
    alignItems: "center",
  },
  passwordStrengthBar: {
    width: scalePercent(70),
    height: responsiveScale(10),
    borderRadius: responsiveScale(5),
    marginBottom: responsiveScale(5),
  },
  passwordStrengthText: {
    textAlign: "center",
    fontSize: responsiveFontSize(14),
    fontFamily: "Inter-Regular",
  },
  inputNeutral: {},
  inputValid: {
    borderColor: "green",
  },
  inputInvalid: {
    borderColor: "red",
  },
});
