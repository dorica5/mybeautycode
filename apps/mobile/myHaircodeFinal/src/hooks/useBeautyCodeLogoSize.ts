import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { responsiveScale } from "@/src/utils/responsive";

/** Same dimensions as Splash so auth screens feel continuous. */
export function useBeautyCodeLogoSize() {
  const { width: windowWidth } = useWindowDimensions();

  return useMemo(() => {
    const w = Math.min(responsiveScale(330, 440), windowWidth * 0.92);
    const h = Math.round((w * 72) / 200);
    return {
      width: w,
      height: Math.max(h, responsiveScale(108, 138)),
    };
  }, [windowWidth]);
}
