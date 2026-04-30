import { View, Text } from "react-native";
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
    </Stack>
  );
};

export default _layout;
