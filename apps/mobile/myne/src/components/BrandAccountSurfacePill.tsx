import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { primaryBlack, primaryGreen } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

type Props = {
  label: string;
  onPress: () => void;
  /** Extra layout (e.g. margin under “My profile”). */
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/**
 * “Switch account” / “Become a professional” pill: mint fill, black border (used app-wide).
 * Use everywhere that navigates between client and professional UI.
 */
export function BrandAccountSurfacePill({
  label,
  onPress,
  style,
  textStyle,
}: Props) {
  return (
    <Pressable
      style={[styles.pill, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.pillLabel, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "center",
    marginBottom: responsiveMargin(16),
    paddingHorizontal: responsivePadding(20),
    paddingVertical: responsivePadding(12),
    borderRadius: responsiveScale(999),
    borderWidth: 1,
    borderColor: primaryBlack,
    backgroundColor: primaryGreen,
  },
  pillLabel: {
    ...Typography.bodyMedium,
    color: primaryBlack,
    textAlign: "center",
  },
});
