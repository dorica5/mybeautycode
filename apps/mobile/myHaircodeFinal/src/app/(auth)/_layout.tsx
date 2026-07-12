import React from "react";
import { Redirect, Stack, useSegments } from "expo-router";
import {
  profileSetupIsComplete,
  useAuth,
} from "../../providers/AuthProvider";
import { resolveAppHome } from "@/src/lib/resolveAppHome";
import LoadingScreen from "../(setup)/LoadingScreen";
import { nativeStackHorizontalIOSLike } from "@/src/constants/nativeStackScreenOptions";

const AuthLayout = () => {
  const {
    session,
    profile,
    loading,
    lastAppSurfacePref,
    isFirstLaunch,
    firstLaunchLoading,
  } = useAuth();
  const segments = useSegments();

  console.log("🎯 AuthLayout - Current state:", {
    hasSession: !!session,
    hasProfile: !!profile,
    setupStatus: profile?.setup_status,
    loading,
    isFirstLaunch,
    segments,
    currentSegment: segments[1],
  });

  if (loading || firstLaunchLoading) {
    return <LoadingScreen />;
  }

  if (!session && isFirstLaunch && segments[1] !== "Onboarding") {
    return <Redirect href="/(auth)/Onboarding" />;
  }

  // Fully set up users should not stay on auth stack (avoids root index loading loop)
  if (
    session &&
    profile &&
    profileSetupIsComplete(profile) &&
    segments[1] !== "Delete" &&
    segments[1] !== "ChangePassword" &&
    segments[1] !== "Onboarding"
  ) {
    const home = resolveAppHome(profile, lastAppSurfacePref);
    console.log("🔄 AuthLayout redirecting to main app", home);
    return <Redirect href={home} />;
  }

  console.log("📱 AuthLayout: Rendering auth stack");
  const stackInitialRoute =
    !session && isFirstLaunch ? "Onboarding" : "Splash";

  return (
    <Stack
      initialRouteName={stackInitialRoute}
      screenOptions={{ headerShown: false, ...nativeStackHorizontalIOSLike }}
    >
      <Stack.Screen name="Onboarding" />
      <Stack.Screen name="Splash" />
      <Stack.Screen name="SignIn" />
      <Stack.Screen name="SignUp" />
      <Stack.Screen name="Reset" />
      <Stack.Screen name="CheckMail" />
      <Stack.Screen name="ChangePassword" />
      <Stack.Screen name="Delete" />

    </Stack>
  );
};

export default AuthLayout;