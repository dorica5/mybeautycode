type SlackFeedbackPayload = {
  typeLabel: string;
  statusLabel: string;
  title: string;
  description: string | null;
  submitterName: string;
  submitterEmail: string | null;
  itemId: string;
  screenshotUrls?: string[];
};

/** Posts a human-readable summary to Slack (optional — no-op when webhook unset). */
export async function notifySlackNewFeedback(
  payload: SlackFeedbackPayload
): Promise<void> {
  const url = process.env.SLACK_FEEDBACK_WEBHOOK_URL?.trim();
  if (!url) return;

  const lines = [
    `*New feedback — ${payload.typeLabel}*`,
    `*Title:* ${payload.title}`,
    payload.description?.trim()
      ? `*Description:*\n${payload.description.trim()}`
      : null,
    `*Status:* ${payload.statusLabel}`,
    `*From:* ${payload.submitterName}${payload.submitterEmail ? ` (${payload.submitterEmail})` : ""}`,
    `*ID:* \`${payload.itemId}\``,
    payload.screenshotUrls?.length
      ? `*Screenshots:*\n${payload.screenshotUrls.map((u, i) => `<${u}|Screenshot ${i + 1}>`).join("\n")}`
      : null,
  ].filter(Boolean);

  const body = JSON.stringify({
    text: lines.join("\n"),
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "New myne feedback", emoji: true },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: lines.join("\n"),
        },
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
        "[slack] feedback webhook failed:",
        res.status,
        await res.text().catch(() => "")
      );
    }
  } catch (err) {
    console.warn("[slack] feedback webhook error:", err);
  }
}

/** User toggled a vote — lightweight ping so the team sees momentum. */
export async function notifySlackFeedbackVote(payload: {
  title: string;
  voteCount: number;
  voterName: string;
  voted: boolean;
}): Promise<void> {
  const url = process.env.SLACK_FEEDBACK_VOTES_WEBHOOK_URL?.trim();
  if (!url) return;

  const action = payload.voted ? "upvoted" : "removed vote from";
  const text = `*${payload.voterName}* ${action} “${payload.title}” — now *${payload.voteCount}* vote${payload.voteCount === 1 ? "" : "s"}`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    /* optional channel — ignore */
  }
}
