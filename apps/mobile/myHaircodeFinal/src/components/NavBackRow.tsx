import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { CaretLeft } from "phosphor-react-native";
import { router } from "expo-router";
import { responsivePadding, responsiveScale } from "@/src/utils/responsive";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack } from "@/src/constants/Colors";

/**
 * Shared back control aligned with Find professionals (`client` userList index):
 * icon size, padding, and label gap stay consistent app-wide.
 *
 * - `default`: top-left “floating” row (alignSelf flex-start).
 * - `inlineBar`: stretches in a parent row (e.g. TopNav left half) without flex-start.
 */
export type NavBackLayout = "default" | "inlineBar";

export type NavBackRowProps = {
  onPress?: () => void;
  accessibilityLabel?: string;
  hitSlop?: number;
  layout?: NavBackLayout;
  style?: StyleProp<ViewStyle>;
  /** @default true — Find professionals uses icon + “Back”. */
  showLabel?: boolean;
};

export function NavBackRow({
  onPress,
  accessibilityLabel = "Back",
  hitSlop = 12,
  layout = "default",
  style,
  showLabel = true,
}: NavBackRowProps) {
  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      style={[styles.row, layout === "default" && styles.rowDefaultAlign, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
    >
      <CaretLeft size={responsiveScale(24)} color={primaryBlack} />
      {showLabel ? <Text style={styles.label}>Back</Text> : null}
    </Pressable>
  );
}

/** Vertical space to reserve when the back control is hidden but layout must stay aligned. */
export function navBackPlaceholderStyle(): Pick<
  ViewStyle,
  "minHeight"
> {
  return { minHeight: responsiveScale(44) };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsivePadding(8),
    paddingVertical: responsivePadding(8),
  },
  rowDefaultAlign: {
    alignSelf: "flex-start",
  },
  label: {
    ...Typography.bodyMedium,
    marginLeft: responsivePadding(4),
    color: primaryBlack,
  },
});

/**
 * Shared top chrome so Back sits at the same inset everywhere (profile, visits,
 * Find pros / map). Wrap NavBackRow in `screenBar`; use `row` when pairing with a trailing action.
 */
export const navBackChromeStyles = StyleSheet.create({
  screenBar: {
    width: "100%",
    alignSelf: "stretch",
    paddingHorizontal: responsivePadding(8),
    paddingTop: responsivePadding(8),
    paddingBottom: responsivePadding(4),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

/** Flatten for a single full-width bar that is itself the flex row (visit header pattern). */
export function navBackChromeBarCombined(): ViewStyle[] {
  return [navBackChromeStyles.screenBar, navBackChromeStyles.row];
}
