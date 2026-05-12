import { StyleSheet } from "react-native";
import React from "react";
import { Stack, usePathname } from "expo-router";
import { nativeStackHorizontalIOSLike } from "@/src/constants/nativeStackScreenOptions";
import { useAuth } from "@/src/providers/AuthProvider";

const _layout = () => {
  const { profile } = useAuth();
  const pathname = usePathname();


  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...nativeStackHorizontalIOSLike,
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
};

export default _layout;

const styles = StyleSheet.create({});
