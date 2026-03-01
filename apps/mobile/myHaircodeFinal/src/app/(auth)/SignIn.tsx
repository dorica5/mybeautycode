/* eslint-disable react/react-in-jsx-scope */
import MyButton from "@/src/components/MyButton";
import MyTextinput from "@/src/components/MyTextinput";
import { Colors } from "@/src/constants/Colors";
import { supabase } from "@/src/lib/supabase";
import { api } from "@/src/lib/apiClient";
import { router } from "expo-router";
import { useState } from "react";
import Logo from "../../../assets/myHaircode_full_logo.svg";
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
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaretLeft } from "phosphor-react-native";
import { 
  responsiveScale, 
  scalePercent,
  responsiveFontSize,
} from "@/src/utils/responsive";
import { StatusBar } from "expo-status-bar";
import { usePostHog } from "posthog-react-native";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const posthog = usePostHog()

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
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : responsiveScale(20)}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable onPress={() => router.back()}>
                <CaretLeft size={responsiveScale(30)} color={Colors.dark.dark} />
              </Pressable>

              <View style={styles.logoContainer}>
                <Logo width={responsiveScale(180, 240)} height={responsiveScale(240, 320)} />
              </View>

              <Text style={styles.title}>Sign In</Text>

              <MyTextinput
                placeholder="Email"
                value={email}
                handleChangeText={setEmail}
                title="Email"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <MyTextinput
                placeholder="Password"
                value={password}
                handleChangeText={setPassword}
                title="Password"
              />

              {errorMessage ? (
                <Text style={styles.errorMessage}>{errorMessage}</Text>
              ) : null}

              <View style={{ marginTop: responsiveScale(30) }}>
                <MyButton
                  text={loading ? "Signing in..." : "Sign In"}
                  margin={false}
                  disabled={loading}
                  onPress={signInWithEmail}
                  style={styles.btn}
                  textSize={18}
                  textTabletSize={14}
                />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.textStyle}>
                  Don't remember your password?
                </Text>
                <Pressable onPress={resetPassword}>
                  <Text style={styles.signInText}>Reset</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default SignIn;

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
});