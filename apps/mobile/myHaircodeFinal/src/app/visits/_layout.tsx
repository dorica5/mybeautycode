import React from "react";
import { Stack } from "expo-router";
import { nativeStackHorizontalIOSLike } from "@/src/constants/nativeStackScreenOptions";
import { primaryGreen } from "@/src/constants/Colors";

const _layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: primaryGreen },
        ...nativeStackHorizontalIOSLike,
      }}
    >
      <Stack.Screen name="view_gallery" />
      <Stack.Screen name="single_visit" />
      <Stack.Screen name="see_visits" />
      <Stack.Screen name="qr_scanner" />
      <Stack.Screen name="new_visit" />
      <Stack.Screen name="gallery" />
    </Stack>
  );
};

export default _layout;
