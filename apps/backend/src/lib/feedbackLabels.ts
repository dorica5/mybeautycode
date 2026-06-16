import type { FeedbackItemStatus, FeedbackItemType } from "@prisma/client";

export const FEEDBACK_TYPE_LABELS: Record<FeedbackItemType, string> = {
  feature: "New feature",
  improvement: "Improvement",
  bug: "Bug fix",
  other: "Other",
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackItemStatus, string> = {
  reviewing: "Under review",
  planned: "Planned",
  in_development: "In development",
  shipped: "Shipped",
  declined: "Not planned",
};

const VALID_TYPES = new Set<string>(Object.keys(FEEDBACK_TYPE_LABELS));

export function parseFeedbackItemType(raw: unknown): FeedbackItemType | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase();
  return VALID_TYPES.has(t) ? (t as FeedbackItemType) : null;
}

export function formatFeedbackItemForApi(row: {
  id: string;
  title: string;
  description: string | null;
  type: FeedbackItemType;
  status: FeedbackItemStatus;
  createdAt: Date;
  voteCount: number;
  viewerHasVoted: boolean;
  screenshotUrls?: string[];
}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    type_label: FEEDBACK_TYPE_LABELS[row.type],
    status: row.status,
    status_label: FEEDBACK_STATUS_LABELS[row.status],
    vote_count: row.voteCount,
    viewer_has_voted: row.viewerHasVoted,
    created_at: row.createdAt.toISOString(),
    screenshot_urls: row.screenshotUrls ?? [],
  };
}
