import { clampVisitTextInput } from "@/src/lib/visitTextInput";

export const FEEDBACK_DESCRIPTION_MAX_CHARS = 240;
export const FEEDBACK_DESCRIPTION_MAX_LINES = 6;
export const FEEDBACK_TEXT_INPUT_HEIGHT_DP = 160;

export function clampFeedbackDescription(text: string): string {
  return clampVisitTextInput(
    text,
    FEEDBACK_DESCRIPTION_MAX_CHARS,
    FEEDBACK_DESCRIPTION_MAX_LINES
  );
}
