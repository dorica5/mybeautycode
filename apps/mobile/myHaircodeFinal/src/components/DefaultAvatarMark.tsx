import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import DefaultAvatarSvg from "@/assets/images/default-avatar.svg";

export type DefaultAvatarMarkProps = {
  size: number;
  style?: StyleProp<ViewStyle>;
};

/** Default user avatar when `avatar_url` / local image is missing (brand mark, scales to any square). */
export function DefaultAvatarMark({ size, style }: DefaultAvatarMarkProps) {
  return <DefaultAvatarSvg width={size} height={size} style={style} />;
}
