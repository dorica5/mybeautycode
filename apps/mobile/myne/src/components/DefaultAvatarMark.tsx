import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import DefaultAvatarSvg from "@/assets/images/default-avatar.svg";

export type DefaultAvatarMarkProps = {
  size: number;
  style?: StyleProp<ViewStyle>;
};

/** Default user avatar when `avatar_url` / local image is missing (brand mark, scales to any square). */
export function DefaultAvatarMark({ size, style }: DefaultAvatarMarkProps) {
  const renderSize = Math.round(size * 1.06);

  return (
    <DefaultAvatarSvg
      width={renderSize}
      height={renderSize}
      viewBox="0 0 200 200"
      style={style}
    />
  );
}
