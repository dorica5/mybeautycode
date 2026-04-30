import { Platform } from "react-native";

/**
 * Horizontal stack motion aligned with iOS: forward pushes from the right,
 * back pops off toward the right. Android's default native-stack animation is
 * often the inverse; `slide_from_right` fixes pop direction for native-stack.
 *
 * @see https://docs.expo.dev/router/advanced/stack/#other-screen-options
 */
export const nativeStackHorizontalIOSLike =
  Platform.OS === "android"
    ? { animation: "slide_from_right" as const }
    : {};
