/* eslint-disable react/react-in-jsx-scope */
import Logo from "../../../assets/images/myBeautyCode_logo.svg";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { PrimaryOutlineTextField } from "@/src/components/PrimaryOutlineTextField";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { useBeautyCodeLogoSize } from "@/src/hooks/useBeautyCodeLogoSize";
import { supabase } from "@/src/lib/supabase";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { CaretLeft } from "phosphor-react-native";
import { useRef, useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StrengthState = { strength: string; feedback: string };

/** One or more human-readable rule failures (sign up). */
function signUpRuleMessages(
  email: string,
  isEmailValid: boolean,
  password: string,
  strength: StrengthState,
): string | null {
  const lines: string[] = [];
  const em = email.trim();
  if (!em) {
    lines.push("Enter your email address.");
  } else if (!isEmailValid) {
    lines.push(
      "Use a valid email address (for example name@domain.com).",
    );
  }

  const pw = password;
  if (!pw.trim()) {
    lines.push("Enter a password.");
  } else if (strength.strength === "Weak") {
    lines.push("Password must be at least 8 characters.");
  }

  if (lines.length === 0) return null;
  return lines.join("\n\n");
}

const SignUp = () => {
  const passwordRef = useRef<TextInput>(null);
  const logoSize = useBeautyCodeLogoSize();
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

  const validateEmail = (emailValue: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

  const handleEmailChange = (value: string) => {
    setErrorMessage("");
    setEmail(value);
    setIsEmailValid(validateEmail(value));
  };

  const checkPasswordStrength = (pwd: string) => {
    let strength = "Weak";
    let color = "red";
    let feedback = "Password must be at least 8 characters.";

    const hasUppercase = /[A-ZÆØÅ]/.test(pwd);
    const hasLowercase = /[a-zæøå]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

    if (pwd.length >= 8) {
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
      pwd.length >= 8
    ) {
      feedback = "Strong password!";
      strength = "Strong";
      color = "green";
    }

    return { strength, color, feedback };
  };

  const handlePasswordChange = (value: string) => {
    setErrorMessage("");
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

  async function signUpWithEmail() {
    const rulesMsg = signUpRuleMessages(
      email,
      isEmailValid,
      password,
      passwordStrength,
    );
    if (rulesMsg) {
      setErrorMessage(rulesMsg);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const user = data?.user;
      if (!user) {
        setErrorMessage("Could not create account. Please try again.");
        return;
      }

      /**
       * When the email is already registered, Supabase returns 200 + a user stub with
       * `identities: []` (enumeration protection). Treat as duplicate, not success.
       */
      const identities = user.identities ?? [];
      if (identities.length === 0) {
        setErrorMessage(
          "An account with this email already exists. Sign in instead.",
        );
        return;
      }

      await AsyncStorage.setItem("freshSignup", "true");

      try {
        posthog.capture("Signed Up");
        posthog.identify(user.id, {
          email: user.email ?? null,
        });
      } catch {
        /* PostHog optional */
      }

      if (!data.session) {
        // Email confirmation on: no session until the user verifies — go to check-email screen
        router.replace("/CheckMail");
        return;
      }

      // Session returned (e.g. confirmations off): AuthProvider picks up via onAuthStateChange
    } catch (err) {
      setErrorMessage("An unexpected error occurred. Please try again.");
      console.error("SignUp error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backRow}
          hitSlop={12}
        >
          <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
        </Pressable>

        <View style={styles.upperHalf}>
          <Logo width={logoSize.width} height={logoSize.height} />
        </View>

        <View style={styles.lowerHalf}>
          <KeyboardAwareScrollView
            style={styles.keyboard}
            contentContainerStyle={styles.scrollContent}
            enableOnAndroid
            enableAutomaticScroll
            extraScrollHeight={responsiveScale(160)}
            extraHeight={responsiveScale(100)}
            keyboardOpeningTime={0}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formBlock}>
              <Text
                accessibilityRole="header"
                style={[Typography.h4, styles.textOnGreen, styles.title]}
              >
                Sign up
              </Text>

              <PrimaryOutlineTextField
                label="Email"
                value={email}
                onChangeText={handleEmailChange}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                containerStyle={styles.emailFieldSpacing}
              />

              <PrimaryOutlineTextField
                inputRef={passwordRef}
                label="Your password"
                value={password}
                onChangeText={handlePasswordChange}
                password
                placeholder="Your password"
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="done"
                containerStyle={styles.passwordFieldSpacing}
              />

              {errorMessage ? (
                <Text style={styles.errorMessage}>{errorMessage}</Text>
              ) : null}

              <PaddedLabelButton
                title={loading ? "Creating account…" : "Create account"}
                horizontalPadding={32}
                verticalPadding={16}
                disabled={loading}
                onPress={signUpWithEmail}
                style={styles.primaryButton}
                textStyle={styles.primaryButtonLabel}
              />
            </View>

            <View style={styles.footerRow}>
              <Text style={[Typography.label, styles.textOnGreen]}>
                Already have an account?{" "}
              </Text>
              <Pressable onPress={goToSignIn} hitSlop={8}>
                <Text
                  style={[
                    Typography.label,
                    styles.textOnGreen,
                    styles.footerLink,
                  ]}
                >
                  Sign in
                </Text>
              </Pressable>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SignUp;

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
    position: "absolute",
    left: responsiveMargin(16),
    top: responsiveMargin(8),
    zIndex: 2,
    paddingVertical: responsiveMargin(4),
  },
  upperHalf: {
    flex: 1,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: responsiveMargin(4),
    paddingBottom: responsiveMargin(32),
  },
  lowerHalf: {
    flex: 2,
    minHeight: 0,
    alignItems: "center",
    width: "100%",
  },
  keyboard: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingTop: 0,
    paddingBottom: responsiveMargin(40),
  },
  formBlock: {
    alignItems: "center",
    width: "100%",
  },
  textOnGreen: {
    color: primaryBlack,
    textAlign: "center",
  },
  title: {
    marginBottom: responsiveMargin(28),
  },
  emailFieldSpacing: {
    marginBottom: responsiveMargin(30),
  },
  passwordFieldSpacing: {
    marginBottom: responsiveMargin(28),
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
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: responsiveMargin(8),
  },
  footerLink: {
    fontFamily: "Outfit_700Bold",
    textDecorationLine: "underline",
  },
});
