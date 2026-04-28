import { primaryWhite } from "@/src/constants/Colors";
import React from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";

/** Full-screen cover when the window is wider than tall so the UI underneath does not relayout. */
export function PortraitEnforcer() {
  const { width, height } = useWindowDimensions();

  if (Platform.OS === "web" || (Platform as { isTV?: boolean }).isTV) {
    return null;
  }

  if (width <= height) {
    return null;
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 100000,
          elevation: 100000,
          backgroundColor: primaryWhite,
        },
      ]}
      pointerEvents="auto"
    />
  );
}
