import { Text, TextInput } from "react-native";

/**
 * Caps OS accessibility text scaling so designed layouts (onboarding, cards, tabs)
 * do not overlap when users enable Larger Text / Display Zoom on their device.
 */
const MAX_FONT_SIZE_MULTIPLIER = 1.2;

let applied = false;

export function applyAppTextScalingDefaults(): void {
  if (applied) return;
  applied = true;

  type TextWithDefaults = typeof Text & {
    defaultProps?: { maxFontSizeMultiplier?: number; allowFontScaling?: boolean };
  };

  const text = Text as TextWithDefaults;
  text.defaultProps = text.defaultProps ?? {};
  text.defaultProps.maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER;

  const input = TextInput as TextWithDefaults;
  input.defaultProps = input.defaultProps ?? {};
  input.defaultProps.maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER;
}
