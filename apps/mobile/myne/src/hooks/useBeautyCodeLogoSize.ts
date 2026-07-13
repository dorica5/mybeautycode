import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { responsiveScale } from "@/src/utils/responsive";

/** appstore.svg / appstore.png — same sizing across Splash, auth, and loading screens. */
export function useBeautyCodeLogoSize() {
  const { width: windowWidth } = useWindowDimensions();

  return useMemo(() => {
    const size = Math.min(responsiveScale(200, 260), windowWidth * 0.5);
    return {
      width: size,
      height: size,
    };
  }, [windowWidth]);
}
