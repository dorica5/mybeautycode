import { Request, Response } from "express";
import { verifySlackRequestSignature } from "../lib/slackVerify";
import { FEEDBACK_STATUS_LABELS } from "../lib/feedbackLabels";
import type { FeedbackItemStatus } from "@prisma/client";
import {
  adminDeleteUserAccount,
  adminResolveReport,
} from "../services/adminModerationService";
import { feedbackService } from "../services/feedbackService";

type SlackInteractionPayload = {
  type?: string;
  user?: { username?: string; name?: string };
  actions?: {
    action_id?: string;
    value?: string;
    selected_option?: { value?: string };
  }[];
  response_url?: string;
};

function signingSecret(): string | null {
  const secret = process.env.SLACK_SIGNING_SECRET?.trim();
  return secret || null;
}

async function postSlackResponse(
  responseUrl: string,
  text: string
): Promise<void> {
  try {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_type: "in_channel",
        replace_original: false,
        text,
      }),
    });
  } catch (err) {
    console.warn("[slack] interaction response failed:", err);
  }
}

export const slackController = {
  async interactions(req: Request, res: Response) {
    const secret = signingSecret();
    if (!secret) {
      return res.status(503).send("Slack interactivity is not configured.");
    }

    const rawBody =
      (req as Request & { rawBody?: string }).rawBody ??
      (typeof req.body === "string" ? req.body : "");
    const signature = req.get("x-slack-signature") ?? undefined;
    const timestamp = req.get("x-slack-request-timestamp") ?? undefined;

    if (!verifySlackRequestSignature(secret, signature, timestamp, rawBody)) {
      return res.status(401).send("Invalid Slack signature.");
    }

    const payloadRaw =
      typeof req.body?.payload === "string" ? req.body.payload : null;
    if (!payloadRaw) {
      return res.status(400).send("Missing payload.");
    }

    let payload: SlackInteractionPayload;
    try {
      payload = JSON.parse(payloadRaw) as SlackInteractionPayload;
    } catch {
      return res.status(400).send("Invalid payload.");
    }

    if (payload.type !== "block_actions") {
      return res.status(200).send("");
    }

    const action = payload.actions?.[0];
    const actor =
      payload.user?.name ?? payload.user?.username ?? "Slack moderator";
    const responseUrl = payload.response_url;

    res.status(200).send("");

    void (async () => {
      try {
        if (!action?.action_id || !action.value) return;

        if (action.action_id === "report_remove_account") {
          const parts = action.value.split("|");
          const reportedId = parts[1]?.trim();
          if (!reportedId) return;
          await adminDeleteUserAccount(reportedId);
          const reportId = parts[0]?.trim();
          if (reportId) {
            await adminResolveReport(reportId, "reviewed");
          }
          if (responseUrl) {
            await postSlackResponse(
              responseUrl,
              `:white_check_mark: *${actor}* removed account \`${reportedId}\`. Client visit records were kept on client accounts; the professional link was removed.`
            );
          }
          return;
        }

        if (
          action.action_id === "report_dismiss" ||
          action.action_id === "report_reviewed"
        ) {
          const reportId = action.value.trim();
          const status =
            action.action_id === "report_dismiss" ? "dismissed" : "reviewed";
          await adminResolveReport(reportId, status);
          if (responseUrl) {
            await postSlackResponse(
              responseUrl,
              `:white_check_mark: *${actor}* marked report \`${reportId}\` as *${status}*.`
            );
          }
          return;
        }

        if (action.action_id === "feedback_set_status") {
          const raw =
            action.selected_option?.value?.trim() ?? action.value?.trim();
          if (!raw) return;
          const [itemId, statusRaw] = raw.split("|");
          if (!itemId || !statusRaw) return;
          const status = statusRaw as FeedbackItemStatus;
          if (!(status in FEEDBACK_STATUS_LABELS)) return;

          const updated = await feedbackService.updateStatusAdmin(
            itemId,
            status
          );
          if (responseUrl) {
            await postSlackResponse(
              responseUrl,
              `:white_check_mark: *${actor}* set “${updated.title}” to *${FEEDBACK_STATUS_LABELS[status]}*. Users will see this on the board when it ranks in the top four.`
            );
          }
        }
      } catch (err) {
        console.error("[slack] interaction handler error:", err);
        if (responseUrl) {
          const msg =
            err instanceof Error ? err.message : "Action failed.";
          await postSlackResponse(
            responseUrl,
            `:x: Report action failed: ${msg}`
          );
        }
      }
    })();
  },
};
