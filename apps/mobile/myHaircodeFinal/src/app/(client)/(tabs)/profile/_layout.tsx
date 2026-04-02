import React from "react";
import { Stack } from "expo-router";

const _layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
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
      <Stack.Screen name="ManageHairdressers" />
    </Stack>
  );
};

export default _layout;

