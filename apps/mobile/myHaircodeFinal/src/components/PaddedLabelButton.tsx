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
  ...pressableProps
}: PaddedLabelButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      {...pressableProps}
      style={({ pressed }) => [
        {
          paddingHorizontal: responsivePadding(horizontalPadding),
          paddingVertical: responsivePadding(verticalPadding),
          opacity: pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      <Text style={[Typography.label, textStyle]}>{title}</Text>
    </Pressable>
  );
}
