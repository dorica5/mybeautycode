import { prisma } from "../lib/prisma";
import type { FeedbackItemStatus, FeedbackItemType } from "@prisma/client";
import { profileDisplayName } from "../lib/profileDisplay";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
  formatFeedbackItemForApi,
  parseFeedbackItemType,
} from "../lib/feedbackLabels";
import {
  notifySlackFeedbackVote,
  notifySlackNewFeedback,
} from "../lib/slackFeedback";
import { storageService } from "./storageService";

const BOARD_STATUSES: FeedbackItemStatus[] = [
  "reviewing",
  "planned",
  "in_development",
  "shipped",
];

const FEEDBACK_SCREENSHOT_BUCKET = "feedback_screenshots";
const MAX_TITLE = 120;
const MAX_DESCRIPTION = 1000;
const MAX_SCREENSHOTS = 3;

function parseStoredScreenshotPaths(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) out.push(x.trim());
  }
  return out;
}

/** Only paths uploaded by this user (`{userId}/…`) are accepted. */
function normalizeScreenshotPathsForUser(
  raw: unknown,
  userId: string
): string[] {
  if (!Array.isArray(raw)) return [];
  const prefix = `${userId}/`;
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const p = x.trim();
    if (!p.startsWith(prefix) || p.includes("..") || p.startsWith("/")) {
      continue;
    }
    if (!out.includes(p)) out.push(p);
    if (out.length >= MAX_SCREENSHOTS) break;
  }
  return out;
}

async function signScreenshotUrls(paths: readonly string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const path of paths) {
    try {
      urls.push(
        await storageService.createSignedUrl(
          FEEDBACK_SCREENSHOT_BUCKET,
          path,
          3600
        )
      );
    } catch {
      /* skip broken paths */
    }
  }
  return urls;
}

async function loadBoardRows(viewerId: string) {
  const rows = await prisma.feedbackItem.findMany({
    where: { status: { in: BOARD_STATUSES } },
    orderBy: [{ createdAt: "desc" }],
    include: {
      votes: {
        select: { userId: true },
      },
    },
  });

  const mapped = await Promise.all(
    rows.map(async (row) => {
      const screenshotPaths = parseStoredScreenshotPaths(row.screenshotPaths);
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        status: row.status,
        createdAt: row.createdAt,
        voteCount: row.votes.length,
        viewerHasVoted: row.votes.some((v) => v.userId === viewerId),
        screenshotUrls: await signScreenshotUrls(screenshotPaths),
      };
    })
  );

  return mapped.sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export const feedbackService = {
  async listForViewer(viewerId: string) {
    const rows = await loadBoardRows(viewerId);
    return rows.map(formatFeedbackItemForApi);
  },

  async submit(
    userId: string,
    input: {
      title: string;
      description?: string | null;
      type?: unknown;
      screenshot_paths?: unknown;
    }
  ) {
    const title = input.title.trim();
    const description = input.description?.trim() || null;
    const type: FeedbackItemType =
      parseFeedbackItemType(input.type) ?? "feature";
    const screenshotPaths = normalizeScreenshotPathsForUser(
      input.screenshot_paths,
      userId
    );

    if (!title) {
      throw Object.assign(new Error("Title is required."), { statusCode: 400 });
    }
    if (title.length > MAX_TITLE) {
      throw Object.assign(new Error("Title is too long."), { statusCode: 400 });
    }
    if (description && description.length > MAX_DESCRIPTION) {
      throw Object.assign(new Error("Description is too long."), {
        statusCode: 400,
      });
    }

    const submitter = await prisma.profile.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const item = await prisma.feedbackItem.create({
      data: {
        title,
        description,
        type,
        status: "reviewing",
        submitterId: userId,
        screenshotPaths,
      },
    });

    const screenshotUrls = await signScreenshotUrls(screenshotPaths);
    const slackScreenshotUrls: string[] = [];
    for (const path of screenshotPaths) {
      try {
        slackScreenshotUrls.push(
          await storageService.createSignedUrl(
            FEEDBACK_SCREENSHOT_BUCKET,
            path,
            60 * 60 * 24
          )
        );
      } catch {
        /* skip */
      }
    }

    void notifySlackNewFeedback({
      typeLabel: FEEDBACK_TYPE_LABELS[type],
      statusLabel: FEEDBACK_STATUS_LABELS.reviewing,
      title,
      description,
      submitterName: submitter
        ? profileDisplayName(submitter)
        : "Unknown user",
      submitterEmail: submitter?.email ?? null,
      itemId: item.id,
      screenshotUrls:
        slackScreenshotUrls.length > 0 ? slackScreenshotUrls : screenshotUrls,
    });

    return formatFeedbackItemForApi({
      id: item.id,
      title: item.title,
      description: item.description,
      type: item.type,
      status: item.status,
      createdAt: item.createdAt,
      voteCount: 0,
      viewerHasVoted: false,
      screenshotUrls,
    });
  },

  async toggleVote(userId: string, itemId: string) {
    const item = await prisma.feedbackItem.findUnique({
      where: { id: itemId },
      select: { id: true, title: true, status: true },
    });
    if (!item || item.status === "declined") {
      throw Object.assign(new Error("Feedback item not found."), {
        statusCode: 404,
      });
    }

    const existing = await prisma.feedbackVote.findUnique({
      where: {
        feedbackItemId_userId: { feedbackItemId: itemId, userId },
      },
    });

    let voted: boolean;
    if (existing) {
      await prisma.feedbackVote.delete({ where: { id: existing.id } });
      voted = false;
    } else {
      await prisma.feedbackVote.create({
        data: { feedbackItemId: itemId, userId },
      });
      voted = true;
    }

    const voteCount = await prisma.feedbackVote.count({
      where: { feedbackItemId: itemId },
    });

    const voter = await prisma.profile.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    void notifySlackFeedbackVote({
      title: item.title,
      voteCount,
      voterName: voter ? profileDisplayName(voter) : "Someone",
      voted,
    });

    return { voted, vote_count: voteCount };
  },
};
