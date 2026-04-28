import React from "react";
import { Href, Redirect, Stack, useSegments } from "expo-router";
import {
  profileSetupIsComplete,
  useAuth,
} from "../../providers/AuthProvider";
import { profileHasProfessionalCapability } from "@/src/constants/professionCodes";
import LoadingScreen from "../(setup)/LoadingScreen";

const AuthLayout = () => {
  const { session, profile, loading, lastAppSurfacePref } = useAuth();
  const segments = useSegments();

  console.log("🎯 AuthLayout - Current state:", {
    hasSession: !!session,
    hasProfile: !!profile,
    setupStatus: profile?.setup_status,
    loading,
    segments,
    currentSegment: segments[1],
  });

  if (loading) {
    return <LoadingScreen />;
  }

  // Fully set up users should not stay on auth stack (avoids root index loading loop)
  if (
    session &&
    profile &&
    profileSetupIsComplete(profile) &&
    segments[1] !== "Delete" &&
    segments[1] !== "ChangePassword"
  ) {
    const canPro = profileHasProfessionalCapability(profile);
    const home: Href =
      canPro && lastAppSurfacePref === "professional"
        ? "/(hairdresser)/(tabs)/home"
        : "/(client)/(tabs)/home";
    console.log("🔄 AuthLayout redirecting to main app", home);
    return <Redirect href={home} />;
  }

  console.log("📱 AuthLayout: Rendering auth stack");
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" />
      <Stack.Screen name="SignIn" />
      <Stack.Screen name="SignUp" />
      <Stack.Screen name="Reset" />
      <Stack.Screen name="CheckMail" />
      <Stack.Screen name="ChangePassword" />
      <Stack.Screen name="Delete" />
      <Stack.Screen name="Onboarding" />

    </Stack>
  );
};

export default AuthLayout;