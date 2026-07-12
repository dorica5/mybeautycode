import { primaryGreen } from "@/src/constants/Colors";
import {
  responsiveMargin,
  responsivePadding,
} from "@/src/utils/responsive";
import React, { type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import {
  SafeAreaView,
  type Edge,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

type MintProfileScreenShellProps = {
  children: ReactNode;
  edges?: readonly Edge[];
};

/**
 * Mint bakgrunn + safe area, samme som frisør profile-redigering (Full name m.fl.).
 */
export function MintProfileScreenShell({
  children,
  edges = ["top", "left", "right"],
}: MintProfileScreenShellProps) {
  return (
    <>
      <StatusBar style="dark" />
      <View style={styles.outer}>
        <SafeAreaView style={styles.safe} edges={edges}>
          {children}
        </SafeAreaView>
      </View>
    </>
  );
}

export const mintProfileScrollContent: ViewStyle = {
  paddingHorizontal: responsivePadding(24),
  paddingTop: responsiveMargin(12),
  paddingBottom: responsiveMargin(32),
  flexGrow: 1,
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: primaryGreen,
  },
  safe: {
    flex: 1,
  },
});
