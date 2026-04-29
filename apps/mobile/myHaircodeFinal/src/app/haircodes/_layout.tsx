import React from "react";
import { Stack } from "expo-router";
import { primaryGreen } from "@/src/constants/Colors";

const _layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: primaryGreen },
      }}
    >
      <Stack.Screen name="view_gallery" />
      <Stack.Screen name="single_haircode" />
      <Stack.Screen name="see_haircode" />
      <Stack.Screen name="qr_scanner" />
      <Stack.Screen name="new_haircode" />
      <Stack.Screen name="gallery" />
    </Stack>
  );
};

export default _layout;
