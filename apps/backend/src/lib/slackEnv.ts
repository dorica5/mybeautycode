/** True when new feedback submissions will post to Slack. */
export function isSlackFeedbackConfigured(): boolean {
  return Boolean(process.env.SLACK_FEEDBACK_WEBHOOK_URL?.trim());
}

export function isSlackFeedbackVotesConfigured(): boolean {
  return Boolean(process.env.SLACK_FEEDBACK_VOTES_WEBHOOK_URL?.trim());
}

export function isSlackReportsConfigured(): boolean {
  return Boolean(process.env.SLACK_REPORTS_WEBHOOK_URL?.trim());
}

export function isSlackReportsInteractiveConfigured(): boolean {
  return Boolean(process.env.SLACK_SIGNING_SECRET?.trim());
}

export function logSlackFeedbackStatus(): void {
  if (isSlackFeedbackConfigured()) {
    console.log("[slack] Feedback webhook configured — new submissions will notify Slack.");
    if (
      process.env.SLACK_BOT_TOKEN?.trim() &&
      process.env.SLACK_FEEDBACK_CHANNEL_ID?.trim() &&
      isSlackReportsInteractiveConfigured()
    ) {
      console.log("[slack] Feedback status menu enabled via bot + SLACK_FEEDBACK_CHANNEL_ID.");
    }
  } else {
    console.warn(
      "[slack] SLACK_FEEDBACK_WEBHOOK_URL is not set — feedback is saved to the database only."
    );
  }
  if (isSlackFeedbackVotesConfigured()) {
    console.log("[slack] Vote webhook configured.");
  }
  if (isSlackReportsConfigured()) {
    console.log("[slack] Reports webhook configured — user reports will notify Slack.");
    if (isSlackReportsInteractiveConfigured()) {
      console.log(
        "[slack] Report action buttons enabled — set Slack app Interactivity URL to https://YOUR-API/api/slack/interactions"
      );
    } else {
      console.warn(
        "[slack] SLACK_SIGNING_SECRET is not set — report Slack messages will not include action buttons."
      );
    }
  } else {
    console.warn(
      "[slack] SLACK_REPORTS_WEBHOOK_URL is not set — reports are saved to the database only."
    );
  }
}
