/* eslint-disable react/react-in-jsx-scope */
import Logo from "../../../assets/images/myBeautyCode_logo.svg";
import { PaddedLabelButton } from "@/src/components/PaddedLabelButton";
import { PrimaryOutlineTextField } from "@/src/components/PrimaryOutlineTextField";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { useBeautyCodeLogoSize } from "@/src/hooks/useBeautyCodeLogoSize";
import { api } from "@/src/lib/apiClient";
import { supabase } from "@/src/lib/supabase";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { CaretLeft } from "phosphor-react-native";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SignIn = () => {
  const logoSize = useBeautyCodeLogoSize();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const posthog = usePostHog();

  const resetPassword = () => router.push("../../Reset");

  async function signInWithEmail() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const profile = await api.get<{ user_type?: string }>("/api/auth/me");

      if (!profile) {
        setErrorMessage("Failed to load profile");
        return;
      }
      posthog.capture("Login", {
        user_id: data.user.id,
        role: profile?.user_type ?? "unknown",
      });
      posthog.identify(data.user.id, {
        email: data.user.email ?? null,
        role: profile?.user_type ?? "unknown",
      });
    } catch (err) {
      setErrorMessage("An unexpected error occurred. Please try again.");
      console.error("SignIn error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
                    style={[Typography.h4, styles.textOnGreen, styles.title]}
                  >
                    Sign in
                  </Text>

                  <PrimaryOutlineTextField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    containerStyle={styles.emailFieldSpacing}
                  />

                  <PrimaryOutlineTextField
                    label="Your password"
                    value={password}
                    onChangeText={setPassword}
                    password
                    placeholder="Your password"
                    autoCapitalize="none"
                    autoComplete="password"
                    containerStyle={styles.passwordFieldSpacing}
                  />

                  {errorMessage ? (
                    <Text style={styles.errorMessage}>{errorMessage}</Text>
                  ) : null}

                  <PaddedLabelButton
                    title={loading ? "Signing in…" : "Sign in"}
                    horizontalPadding={32}
                    verticalPadding={16}
                    disabled={loading}
                    onPress={signInWithEmail}
                    style={styles.signInButton}
                    textStyle={styles.signInButtonLabel}
                  />
                </View>

                <View style={styles.footerCol}>
                  <Text style={[Typography.label, styles.textOnGreen]}>
                    Don&apos;t remember your password?
                  </Text>
                  <Pressable onPress={resetPassword} hitSlop={8}>
                    <Text
                      style={[
                        Typography.label,
                        styles.textOnGreen,
                        styles.resetLink,
                      ]}
                    >
                      Reset password
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default SignIn;

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
  /**
   * Shorter band than Splash’s 1:1 split so “Sign in” + fields sit higher.
   * 1:2 ≈ 33% / 67% (tighter than 2:3) — no overlap over the logo.
   */
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
  /** No negative margins: they pull content above ScrollView’s clip and hide it behind “empty” green. */
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingTop: 0,
    paddingBottom: responsiveMargin(24),
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
  signInButton: {
    alignSelf: "center",
    marginTop: responsiveMargin(28),
    backgroundColor: primaryBlack,
    borderRadius: responsiveScale(999),
  },
  signInButtonLabel: {
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
  footerCol: {
    alignItems: "center",
    gap: responsiveMargin(6),
    paddingBottom: responsiveMargin(8),
  },
  resetLink: {
    fontFamily: "Outfit_700Bold",
    textDecorationLine: "underline",
  },
});
