import { Platform, type TextStyle } from "react-native";
import { primaryBlack } from "@/src/constants/Colors";
import { FONT_FAMILY } from "@/src/constants/Typography";
import { responsiveFontSize, responsivePadding, responsiveScale } from "@/src/utils/responsive";

/** Visit description + client personal note share the same text limits. */
export const VISIT_TEXT_MAX_CHARS = 140;
/** Prevents tall boxes from many single-character newline presses. */
export const VISIT_TEXT_MAX_LINES = 6;
/** Max multiline box height (dp) — field grows with content up to this cap. */
export const VISIT_TEXT_INPUT_HEIGHT_DP = 160;

const VISIT_TEXT_FONT_SIZE = 18;
/** Tighter than bodyMedium (140%) so wrapped lines don’t shift while scrolling. */
const VISIT_TEXT_LINE_HEIGHT_RATIO = 1.28;

const visitTextLineHeight = () => {
  const fontSize = responsiveFontSize(VISIT_TEXT_FONT_SIZE);
  return Math.round(fontSize * VISIT_TEXT_LINE_HEIGHT_RATIO);
};

export function visitMultilineInputTextStyle(): TextStyle {
  const lineHeight = visitTextLineHeight();
  return {
    fontFamily: FONT_FAMILY.outfitLight,
    fontSize: responsiveFontSize(VISIT_TEXT_FONT_SIZE),
    lineHeight,
    color: primaryBlack,
    textAlignVertical: "top",
    ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
  };
}

/** One line of text + vertical padding — used as the collapsed min height. */
export function visitMultilineInputMinHeight(): number {
  const verticalPad = responsivePadding(12) + responsivePadding(12);
  return visitTextLineHeight() + verticalPad;
}

export function visitMultilineInputMaxHeight(
  maxHeightDp: number = VISIT_TEXT_INPUT_HEIGHT_DP
): number {
  return responsiveScale(maxHeightDp);
}

export function visitMultilineInputBoxStyle(
  maxHeightDp: number = VISIT_TEXT_INPUT_HEIGHT_DP,
  options?: { flushHorizontal?: boolean }
): TextStyle {
  return {
    minHeight: visitMultilineInputMinHeight(),
    maxHeight: visitMultilineInputMaxHeight(maxHeightDp),
    flexGrow: 0,
    flexShrink: 0,
    width: "100%",
    paddingTop: responsivePadding(12),
    paddingBottom: responsivePadding(12),
    paddingHorizontal: options?.flushHorizontal
      ? 0
      : responsivePadding(18),
  };
}

export function clampVisitTextInput(
  text: string,
  maxChars: number = VISIT_TEXT_MAX_CHARS,
  maxLines: number = VISIT_TEXT_MAX_LINES
): string {
  const clipped = text.slice(0, maxChars);
  const lines = clipped.split("\n");
  if (lines.length <= maxLines) return clipped;
  return lines.slice(0, maxLines).join("\n");
}
