import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";

type Props = {
  accessibilityLabel?: string;
};

/**
 * Full-screen loader for navigations where the screen must paint immediately
 * (avoids white flashes while React Query / auth gates resolve).
 */
export default function ThemedRouteLoading({
  accessibilityLabel = "Loading",
}: Props) {
  return (
    <>
      <StatusBar style="dark" backgroundColor={primaryGreen} />
      <View
        style={styles.container}
        accessibilityLabel={accessibilityLabel}
      >
        <ActivityIndicator size="large" color={primaryBlack} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: primaryGreen,
    alignItems: "center",
    justifyContent: "center",
  },
});
