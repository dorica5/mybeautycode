import { Typography } from "@/src/constants/Typography";
import { responsivePadding } from "@/src/utils/responsive";
import React from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";

export type PaddedLabelButtonProps = Omit<PressableProps, "children"> & {
  title: string;
  /** Base horizontal padding; scaled with `responsivePadding`. */
  horizontalPadding: number;
  /** Base vertical padding; scaled with `responsivePadding`. */
  verticalPadding: number;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
};

/**
 * Pressable using `Typography.label` with configurable padding (e.g. 32 / 16).
 */
export function PaddedLabelButton({
  title,
  horizontalPadding,
  verticalPadding,
  textStyle,
  style,
  disabled,
  ...pressableProps
}: PaddedLabelButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      {...pressableProps}
      disabled={disabled}
      android_ripple={{ color: "rgba(255,255,255,0.2)" }}
      style={[
        {
          paddingHorizontal: responsivePadding(horizontalPadding),
          paddingVertical: responsivePadding(verticalPadding),
        },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {({ pressed }) => (
        <Text
          style={[
            Typography.label,
            textStyle,
            !disabled && pressed && { opacity: 0.88 },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
