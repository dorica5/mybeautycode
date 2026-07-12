import React from "react";
import { Redirect, Stack, usePathname, useSegments } from "expo-router";
import { nativeStackHorizontalIOSLike } from "@/src/constants/nativeStackScreenOptions";
import {
  profileSetupIsComplete,
  useAuth,
} from "@/src/providers/AuthProvider";
import { resolveAppHome } from "@/src/lib/resolveAppHome";
import LoadingScreen from "../(setup)/LoadingScreen";

/** Completed users may still open these from Profile / Switch account. */
const POST_SETUP_SETUP_MARKERS = [
  "AddProfession",
  "ProfessionalSetup",
  "ChooseProfession",
  "TermsAndPrivacy",
] as const;

function isPostSetupSetupRoute(segments: string[], pathname: string): boolean {
  if (POST_SETUP_SETUP_MARKERS.some((m) => segments.includes(m))) {
    return true;
  }
  return POST_SETUP_SETUP_MARKERS.some((m) => pathname.includes(m));
}

const SetupLayout = () => {
  const { session, profile, loading, loadingProfile, lastAppSurfacePref } =
    useAuth();
  const segments = useSegments();
  const pathname = usePathname();

  if (loading || (session && loadingProfile)) {
    return <LoadingScreen />;
  }

  if (
    session &&
    profile &&
    profileSetupIsComplete(profile) &&
    !isPostSetupSetupRoute(segments, pathname)
  ) {
    return <Redirect href={resolveAppHome(profile, lastAppSurfacePref)} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...nativeStackHorizontalIOSLike,
      }}
    >
      <Stack.Screen name="GeneralSetup" />
      <Stack.Screen name="ChooseRole" />
      <Stack.Screen name="ChooseProfession" />
      <Stack.Screen name="AddProfession" />
      <Stack.Screen name="ProfessionalSetup" />
      <Stack.Screen name="ClientSetup" />
      <Stack.Screen name="FullName" />
      <Stack.Screen name="LoadingScreen" />
      <Stack.Screen name="PhoneNumber" />
      <Stack.Screen name="ProfilePicture" />
      <Stack.Screen name="TermsAndPrivacy" />
      <Stack.Screen name="Setup" />
    </Stack>
  );
};

export default SetupLayout;
