import React from "react";
import { Stack } from "expo-router";
import { nativeStackHorizontalIOSLike } from "@/src/constants/nativeStackScreenOptions";

const _layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...nativeStackHorizontalIOSLike,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="FirstName" />
      <Stack.Screen name="LastName" />
      <Stack.Screen name="Username" />
      <Stack.Screen name="PhoneNumber" />
      <Stack.Screen name="ProfilePicture" />
      <Stack.Screen name="AboutMe" />
      <Stack.Screen name="client_profile" />
      <Stack.Screen name="ManageProfessionals" />
    </Stack>
  );
};

export default _layout;

