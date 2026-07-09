/**
 * Sends a test message to SLACK_REPORTS_WEBHOOK_URL.
 * Usage (from apps/backend): npm run slack:reports:test
 */
import "dotenv/config";
import { notifySlackUserReport } from "../src/lib/slackReport";
import { isSlackReportsConfigured } from "../src/lib/slackEnv";

async function main() {
  if (!isSlackReportsConfigured()) {
    console.error(
      "SLACK_REPORTS_WEBHOOK_URL is not set in apps/backend/.env\n" +
        "Create an Incoming Webhook: https://api.slack.com/apps → Incoming Webhooks"
    );
    process.exit(1);
  }

  await notifySlackUserReport({
    reportId: "00000000-0000-4000-8000-000000000001",
    reason: "harassment",
    priority: "high",
    reporterName: "Test reporter",
    reporterEmail: "reporter@example.com",
    reporterId: "00000000-0000-4000-8000-000000000002",
    reportedName: "Test reported user",
    reportedEmail: "reported@example.com",
    reportedId: "00000000-0000-4000-8000-000000000003",
    professionCode: "hair",
    context: "slack_test_script",
    additionalDetails: "This is a test report notification from the backend.",
    totalReportsOnUser: 1,
    autoRestricted: false,
    blockedForReporter: true,
  });

  console.log("Test report message sent. Check your Slack channel.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
