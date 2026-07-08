/**
 * Sends a test message to SLACK_FEEDBACK_WEBHOOK_URL.
 * Usage (from apps/backend): npm run slack:feedback:test
 */
import "dotenv/config";
import { notifySlackNewFeedback } from "../src/lib/slackFeedback";
import { isSlackFeedbackConfigured } from "../src/lib/slackEnv";

async function main() {
  if (!isSlackFeedbackConfigured()) {
    console.error(
      "SLACK_FEEDBACK_WEBHOOK_URL is not set in apps/backend/.env\n" +
        "Create an Incoming Webhook: https://api.slack.com/apps → Incoming Webhooks"
    );
    process.exit(1);
  }

  await notifySlackNewFeedback({
    typeLabel: "Test",
    statusLabel: "Reviewing",
    title: "myne feedback — Slack connection test",
    description:
      "If you see this in Slack, feedback notifications are wired up correctly.",
    submitterName: "Backend test script",
    submitterEmail: null,
    itemId: "00000000-0000-4000-8000-000000000000",
  });

  console.log("Test message sent. Check your Slack channel.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
