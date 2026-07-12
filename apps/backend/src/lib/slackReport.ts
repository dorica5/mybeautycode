import {
  REPORT_REASON_LABELS,
  type ReportPriority,
} from "./reportMeta";

export type SlackReportPayload = {
  reportId: string;
  reason: string;
  priority: ReportPriority;
  reporterName: string;
  reporterEmail: string | null;
  reporterId: string;
  reportedName: string;
  reportedEmail: string | null;
  reportedId: string;
  professionCode: string | null;
  context: string | null;
  additionalDetails: string | null;
  totalReportsOnUser: number;
  autoRestricted: boolean;
  blockedForReporter: boolean;
};

export async function notifySlackUserReport(
  payload: SlackReportPayload
): Promise<void> {
  const url = process.env.SLACK_REPORTS_WEBHOOK_URL?.trim();
  if (!url) return;

  const reasonLabel = REPORT_REASON_LABELS[payload.reason] ?? payload.reason;
  const priorityTag =
    payload.priority === "high"
      ? ":rotating_light: *High priority*"
      : payload.priority === "medium"
        ? ":warning: Medium priority"
        : "Low priority";

  const lines = [
    priorityTag,
    `*Reason:* ${reasonLabel}`,
    payload.additionalDetails?.trim()
      ? `*Details from reporter:*\n${payload.additionalDetails.trim()}`
      : null,
    `*Reporter:* ${payload.reporterName} (\`${payload.reporterId}\`)${payload.reporterEmail ? ` — ${payload.reporterEmail}` : ""}`,
    `*Reported:* ${payload.reportedName} (\`${payload.reportedId}\`)${payload.reportedEmail ? ` — ${payload.reportedEmail}` : ""}`,
    payload.professionCode ? `*Lane:* \`${payload.professionCode}\`` : null,
    payload.context ? `*Context:* ${payload.context}` : null,
    `*Total reports on this account:* ${payload.totalReportsOnUser}`,
    payload.blockedForReporter
      ? "_Reporter was auto-blocked from this account on this lane._"
      : null,
    payload.autoRestricted
      ? "_Account was auto-restricted after repeated reports._"
      : null,
    `*Report ID:* \`${payload.reportId}\``,
  ].filter(Boolean);

  const body = JSON.stringify({
    text: lines.join("\n"),
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "User report — myne",
          emoji: true,
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: lines.join("\n") },
      },
    ],
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) {
      console.warn(
        "[slack] reports webhook failed:",
        res.status,
        await res.text().catch(() => "")
      );
    }
  } catch (err) {
    console.warn("[slack] reports webhook error:", err);
  }
}
