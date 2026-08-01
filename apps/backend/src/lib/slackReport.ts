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

function reportActionBlocks(payload: SlackReportPayload) {
  const secret = process.env.SLACK_SIGNING_SECRET?.trim();
  if (!secret) return [];

  return [
    {
      type: "actions",
      block_id: `report_actions_${payload.reportId}`,
      elements: [
        {
          type: "button",
          action_id: "report_remove_account",
          text: { type: "plain_text", text: "Remove account", emoji: true },
          style: "danger",
          value: `${payload.reportId}|${payload.reportedId}`,
          confirm: {
            title: { type: "plain_text", text: "Remove this account?" },
            text: {
              type: "mrkdwn",
              text: "Deletes the user from myne. Client visit records stay on client accounts; the professional link is removed.",
            },
            confirm: { type: "plain_text", text: "Remove" },
            deny: { type: "plain_text", text: "Cancel" },
          },
        },
        {
          type: "button",
          action_id: "report_reviewed",
          text: { type: "plain_text", text: "Mark reviewed", emoji: true },
          value: payload.reportId,
        },
        {
          type: "button",
          action_id: "report_dismiss",
          text: { type: "plain_text", text: "Dismiss", emoji: true },
          value: payload.reportId,
        },
      ],
    },
  ];
}

function buildReportBlocks(payload: SlackReportPayload, includeActions: boolean) {
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

  const blocks: Record<string, unknown>[] = [
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
  ];

  if (includeActions) {
    blocks.push(...reportActionBlocks(payload));
  }

  return { lines, blocks };
}

async function postReportViaBot(
  payload: SlackReportPayload,
  token: string,
  channel: string
): Promise<boolean> {
  const { lines, blocks } = buildReportBlocks(payload, true);
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel,
        text: lines.join("\n"),
        blocks,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!json.ok) {
      console.warn("[slack] chat.postMessage failed:", json.error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[slack] chat.postMessage error:", err);
    return false;
  }
}

async function postReportViaWebhook(payload: SlackReportPayload): Promise<void> {
  const url = process.env.SLACK_REPORTS_WEBHOOK_URL?.trim();
  if (!url) return;

  const { lines, blocks } = buildReportBlocks(payload, false);

  const body = JSON.stringify({
    text: lines.join("\n"),
    blocks,
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

export async function notifySlackUserReport(
  payload: SlackReportPayload
): Promise<void> {
  const botToken = process.env.SLACK_BOT_TOKEN?.trim();
  const channel = process.env.SLACK_REPORTS_CHANNEL_ID?.trim();

  if (botToken && channel && process.env.SLACK_SIGNING_SECRET?.trim()) {
    const ok = await postReportViaBot(payload, botToken, channel);
    if (ok) return;
  }

  await postReportViaWebhook(payload);
}
