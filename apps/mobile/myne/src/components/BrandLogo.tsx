import React from "react";
import { Image, Platform, StyleProp, View, ViewStyle } from "react-native";
import LogoSvg from "../../assets/appstore.svg";

/** Rasterized from appstore.svg — avoids Android SVG mask/clip bugs. */
const BRAND_LOGO_PNG = require("../../assets/appstore.png");

type BrandLogoProps = {
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Brand mark for Splash, auth, setup, paywall, and loading screens.
 * Android uses PNG (react-native-svg clips embedded raster SVGs); iOS keeps SVG.
 */
export function BrandLogo({ width, height, style }: BrandLogoProps) {
  if (Platform.OS === "android") {
    return (
      <View style={[{ width, height, overflow: "visible" }, style]}>
        <Image
          source={BRAND_LOGO_PNG}
          style={{ width, height }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  return (
    <View style={[{ width, height, overflow: "visible" }, style]}>
      <LogoSvg width={width} height={height} />
    </View>
  );
}
