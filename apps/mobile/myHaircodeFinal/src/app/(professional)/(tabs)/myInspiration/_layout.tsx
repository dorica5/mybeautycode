import React from "react";
import { Stack } from "expo-router";
import { nativeStackHorizontalIOSLike } from "@/src/constants/nativeStackScreenOptions";

const _layout = () => {
  return (
    <Stack screenOptions={{ ...nativeStackHorizontalIOSLike }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
};

export default _layout;
