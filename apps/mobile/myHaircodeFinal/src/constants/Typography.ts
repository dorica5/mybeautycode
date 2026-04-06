import { TextStyle } from "react-native";

import { primaryBlack } from "./Colors";
import { responsiveFontSize } from "../utils/responsive";

/** Font family names must match keys passed to `useFonts` / `@expo-google-fonts/*` loaders. */
export const FONT_FAMILY = {
  anton: "Anton_400Regular",
  outfitLight: "Outfit_300Light",
  outfitRegular: "Outfit_400Regular",
  outfitMedium: "Outfit_500Medium",
} as const;

function antonHeading(
  size: number,
  lineHeightPercent: number
): TextStyle {
  const fs = responsiveFontSize(size);
  return {
    fontFamily: FONT_FAMILY.anton,
    fontSize: fs,
    fontWeight: "400",
    lineHeight: Math.round((fs * lineHeightPercent) / 100),
    letterSpacing: 0,
    color: primaryBlack,
  };
}

function outfitText(
  size: number,
  weight: "300" | "500",
  lineHeightPercent?: number
): TextStyle {
  const fs = responsiveFontSize(size);
  const family =
    weight === "300" ? FONT_FAMILY.outfitLight : FONT_FAMILY.outfitMedium;
  const style: TextStyle = {
    fontFamily: family,
    fontSize: fs,
    fontWeight: weight,
    letterSpacing: 0,
    color: primaryBlack,
  };
  if (lineHeightPercent !== undefined) {
    style.lineHeight = Math.round((fs * lineHeightPercent) / 100);
  }
  return style;
}

function outfitRegularText(size: number, lineHeightPercent?: number): TextStyle {
  const fs = responsiveFontSize(size);
  const style: TextStyle = {
    fontFamily: FONT_FAMILY.outfitRegular,
    fontSize: fs,
    fontWeight: "400",
    letterSpacing: 0,
    color: primaryBlack,
  };
  if (lineHeightPercent !== undefined) {
    style.lineHeight = Math.round((fs * lineHeightPercent) / 100);
  }
  return style;
}

/**
 * Brand typography scale. Use by spreading into `Text`: `<Text style={Typography.h1}>…</Text>`
 * or `style={[Typography.bodyMedium, { textAlign: 'center' }]}>`.
 */
export const Typography = {
  h1: antonHeading(48, 130),
  h2: antonHeading(44, 120),
  h3: antonHeading(36, 120),
  /** Anton 24 regular — e.g. username under display name on client home. */
  anton24: antonHeading(24, 120),
  /** Anton 16 regular — e.g. subtitle on pro home (My clients) or profession line under “My visits”. */
  anton16: antonHeading(16, 120),
  h4: outfitText(24, "300", 120),
  bodyLarge: outfitText(20, "300", 130),
  bodyMedium: outfitText(18, "300", 140),
  bodySmall: outfitText(16, "300", 140),
  /** Line height: automatic (default line metrics). */
  label: outfitText(16, "500"),
  /** AG label 16 — section / field captions (Outfit medium 16). */
  agLabel16: outfitText(16, "500", 140),
  /** AG body medium 18 / 148% — large option rows (Outfit medium 18). */
  agBodyMedium18: outfitText(18, "500", 148),
  /** AG body regular 18 / 148% — filter options (Outfit light 18). */
  agBodyRegular18: outfitText(18, "300", 148),
  /** Outfit regular 16 — e.g. map location CTA. */
  outfitRegular16: outfitRegularText(16, 140),
  /** AG 20 — Outfit medium, 130% line (e.g. pro home empty state). */
  ag20: outfitText(20, "500", 130),
} as const;

export type TypographyKey = keyof typeof Typography;
