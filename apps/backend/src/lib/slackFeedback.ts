import { FEEDBACK_STATUS_LABELS } from "./feedbackLabels";

export type SlackFeedbackPayload = {
  typeLabel: string;
  statusLabel: string;
  title: string;
  description: string | null;
  submitterName: string;
  submitterEmail: string | null;
  itemId: string;
  screenshotUrls?: string[];
};

function feedbackStatusSelectBlock(itemId: string) {
  const secret = process.env.SLACK_SIGNING_SECRET?.trim();
  if (!secret) return [];

  const options = (
    [
      "reviewing",
      "planned",
      "in_development",
      "shipped",
      "declined",
    ] as const
  ).map((status) => ({
    text: {
      type: "plain_text" as const,
      text: FEEDBACK_STATUS_LABELS[status],
      emoji: true,
    },
    value: `${itemId}|${status}`,
  }));

  return [
    {
      type: "actions",
      block_id: `feedback_status_${itemId}`,
      elements: [
        {
          type: "static_select",
          action_id: "feedback_set_status",
          placeholder: {
            type: "plain_text",
            text: "Change status",
            emoji: true,
          },
          options,
        },
      ],
    },
  ];
}

function buildFeedbackBlocks(
  payload: SlackFeedbackPayload,
  includeActions: boolean
) {
  const lines = [
    `*New feedback — ${payload.typeLabel}*`,
    `*Title:* ${payload.title}`,
    payload.description?.trim()
      ? `*Description:*\n${payload.description.trim()}`
      : null,
    `*Status:* ${payload.statusLabel}`,
    `*From:* ${payload.submitterName}${payload.submitterEmail ? ` (${payload.submitterEmail})` : ""}`,
    `*ID:* \`${payload.itemId}\``,
  ].filter(Boolean);

  const blocks: Record<string, unknown>[] = [
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
  ];

  if (includeActions) {
    blocks.push(...feedbackStatusSelectBlock(payload.itemId));
  }

  for (const [i, imageUrl] of (payload.screenshotUrls ?? []).entries()) {
    blocks.push({
      type: "image",
      image_url: imageUrl,
      alt_text: `Feedback screenshot ${i + 1}`,
      title: {
        type: "plain_text",
        text: `Screenshot ${i + 1}`,
        emoji: true,
      },
    });
  }

  return { lines, blocks };
}

async function postFeedbackViaBot(
  payload: SlackFeedbackPayload,
  token: string,
  channel: string
): Promise<boolean> {
  const { lines, blocks } = buildFeedbackBlocks(payload, true);
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
      console.warn("[slack] feedback chat.postMessage failed:", json.error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[slack] feedback chat.postMessage error:", err);
    return false;
  }
}

async function postFeedbackViaWebhook(payload: SlackFeedbackPayload): Promise<void> {
  const url = process.env.SLACK_FEEDBACK_WEBHOOK_URL?.trim();
  if (!url) return;

  const { lines, blocks } = buildFeedbackBlocks(payload, false);

  const body = JSON.stringify({
    text: [
      ...lines,
      payload.screenshotUrls?.length
        ? `Screenshots: ${payload.screenshotUrls.length} attached`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
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
        "[slack] feedback webhook failed:",
        res.status,
        await res.text().catch(() => "")
      );
    }
  } catch (err) {
    console.warn("[slack] feedback webhook error:", err);
  }
}

/** Posts a human-readable summary to Slack (optional — no-op when webhook unset). */
export async function notifySlackNewFeedback(
  payload: SlackFeedbackPayload
): Promise<void> {
  const botToken = process.env.SLACK_BOT_TOKEN?.trim();
  const channel = process.env.SLACK_FEEDBACK_CHANNEL_ID?.trim();

  if (botToken && channel && process.env.SLACK_SIGNING_SECRET?.trim()) {
    const ok = await postFeedbackViaBot(payload, botToken, channel);
    if (ok) return;
  }

  await postFeedbackViaWebhook(payload);
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
