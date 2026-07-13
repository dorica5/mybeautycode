export const FEEDBACK_MAX_TITLE = 120;
export const FEEDBACK_MAX_DESCRIPTION = 240;
export const FEEDBACK_MAX_DESCRIPTION_LINES = 6;
export const FEEDBACK_MAX_SCREENSHOTS = 3;
/** Only new feature ideas appear on the public voting board. */
export const BOARD_VOTABLE_FEEDBACK_TYPE = "feature" as const;

export function isBoardVotableFeedbackType(type: string): boolean {
  return type === BOARD_VOTABLE_FEEDBACK_TYPE;
}

/** Only the top N feature ideas appear on the in-app voting board. */
export const FEEDBACK_BOARD_VISIBLE_LIMIT = 4;

export function assertFeedbackDescriptionLength(description: string | null): void {
  if (!description) return;
  if (description.length > FEEDBACK_MAX_DESCRIPTION) {
    throw Object.assign(new Error("Description is too long."), { statusCode: 400 });
  }
  const lineCount = description.split("\n").length;
  if (lineCount > FEEDBACK_MAX_DESCRIPTION_LINES) {
    throw Object.assign(new Error("Description has too many lines."), {
      statusCode: 400,
    });
  }
}
