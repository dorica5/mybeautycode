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
import { useRef, useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const SignIn = () => {
  const passwordRef = useRef<TextInput>(null);
  const { height: windowHeight } = useWindowDimensions();
  const logoSize = useBeautyCodeLogoSize();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const posthog = usePostHog();

  const resetPassword = () => router.push("../../Reset");

  async function signInWithEmail() {
    setErrorMessage("");
    const lines: string[] = [];
    if (!email.trim()) {
      lines.push("Enter your email address.");
    }
    if (!password) {
      lines.push("Enter your password.");
    }
    if (lines.length > 0) {
      setErrorMessage(lines.join("\n\n"));
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      let profile: { user_type?: string; setup_status?: boolean } | null =
        null;
      try {
        profile = await api.get<{
          user_type?: string;
          setup_status?: boolean;
        }>("/api/auth/me");
      } catch (meErr: unknown) {
        const err = meErr as Error & { status?: number };
        const status = err.status;
        const msg = (err.message ?? "").toLowerCase();
        const needsProfileOnly =
          status === 404 ||
          msg.includes("profile not found") ||
          (msg.includes("not found") && status !== 500);
        if (needsProfileOnly) {
          posthog.capture("Login", {
            user_id: data.user.id,
            role: "pending_setup",
          });
          posthog.identify(data.user.id, {
            email: data.user.email ?? null,
            role: "pending_setup",
          });
          router.replace("/Setup");
          return;
        }
        throw meErr;
      }

      if (!profile) {
        router.replace("/Setup");
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

  const bottomPad = Math.max(insets.bottom, responsiveMargin(16)) + responsiveMargin(24);
  const topPad = insets.top + responsiveMargin(8);
  const minInnerHeight = windowHeight - topPad - bottomPad;

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <StatusBar style="dark" />
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPad, paddingTop: topPad },
        ]}
        enableOnAndroid
        enableAutomaticScroll
        keyboardOpeningTime={0}
        extraScrollHeight={responsiveScale(140)}
        extraHeight={responsiveScale(72)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        enableResetScrollToCoords={false}
      >
        <View
          style={[
            styles.inner,
            {
              paddingHorizontal: responsivePadding(24),
              minHeight: minInnerHeight,
            },
          ]}
        >
          <View style={styles.topSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={styles.backRow}
              hitSlop={12}
            >
              <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
            </Pressable>

            <View style={styles.logoBlock}>
              <Logo width={logoSize.width} height={logoSize.height} />
            </View>

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
              onChangeText={(t) => {
                setErrorMessage("");
                setEmail(t);
              }}
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
                onChangeText={(t) => {
                  setErrorMessage("");
                  setPassword(t);
                }}
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
                title={loading ? "Signing in…" : "Sign in"}
                horizontalPadding={32}
                verticalPadding={16}
                disabled={loading}
                onPress={signInWithEmail}
                style={styles.signInButton}
                textStyle={styles.signInButtonLabel}
              />
            </View>
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
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default SignIn;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scroll: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flexGrow: 1,
  },
  topSection: {
    width: "100%",
  },
  backRow: {
    alignSelf: "flex-start",
    paddingVertical: responsiveMargin(4),
    marginBottom: responsiveMargin(8),
    zIndex: 2,
  },
  logoBlock: {
    alignItems: "center",
    marginBottom: responsiveMargin(20),
    overflow: "hidden",
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
    marginBottom: responsiveMargin(22),
  },
  emailFieldSpacing: {
    marginBottom: responsiveMargin(22),
  },
  passwordFieldSpacing: {
    marginBottom: responsiveMargin(20),
  },
  signInButton: {
    alignSelf: "center",
    marginTop: responsiveMargin(22),
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
    marginTop: "auto",
    paddingTop: responsiveMargin(16),
  },
  resetLink: {
    fontFamily: "Outfit_700Bold",
    textDecorationLine: "underline",
  },
});
