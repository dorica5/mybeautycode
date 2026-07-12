import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import { router, Stack, usePathname } from "expo-router";
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
      <Stack.Screen name="clientProfile" options={{ headerShown: false }} />
    </Stack>
  );
};

export default _layout;

const styles = StyleSheet.create({});
