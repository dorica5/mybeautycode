import { primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  contentCardMaxWidth,
  isTablet,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";
import React, { useMemo } from "react";
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
  useWindowDimensions,
} from "react-native";

export type BrandHomeNavLinkProps = Omit<
  PressableProps,
  "children" | "style"
> & {
  title: string;
  style?: ViewStyle;
};

/**
 * White outlined block link (client home: “My visits”, “My inspiration”).
 * Padding: horizontal 24, vertical 20 (scaled); text: Typography.bodyMedium.
 */
export function BrandHomeNavLink({
  title,
  style,
  ...pressableProps
}: BrandHomeNavLinkProps) {
  const { width, height } = useWindowDimensions();
  const maxW = useMemo(() => {
    const shortSide = Math.min(width, height);
    const padTotal = responsivePadding(24) * 2;
    if (!isTablet()) return 400;
    return Math.min(contentCardMaxWidth(shortSide), width - padTotal);
  }, [width, height]);

  return (
    <Pressable
      accessibilityRole="button"
      {...pressableProps}
      style={({ pressed }) => [
        styles.base,
        { maxWidth: maxW },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[Typography.bodyMedium, styles.label]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    alignSelf: "center",
    backgroundColor: primaryWhite,
    borderWidth: 1,
    borderColor: primaryBlack,
    borderRadius: responsiveScale(14),
    paddingHorizontal: responsivePadding(24),
    paddingVertical: responsivePadding(20),
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.92,
  },
  label: {
    color: primaryBlack,
    textAlign: "center",
  },
});
