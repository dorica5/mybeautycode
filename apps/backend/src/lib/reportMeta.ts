export type ReportPriority = "high" | "medium" | "low";

const REPORT_PRIORITY: Record<string, ReportPriority> = {
  harassment: "high",
  inappropriate_content: "high",
  spam_fake: "medium",
  unprofessional: "medium",
  other: "low",
};

export function reportPriorityForReason(reason: string): ReportPriority {
  return REPORT_PRIORITY[reason] ?? "medium";
}

export const REPORT_REASON_LABELS: Record<string, string> = {
  spam_fake: "Spam or fake profile",
  inappropriate_content: "Inappropriate content",
  harassment: "Harassment or bullying",
  unprofessional: "Unprofessional behavior",
  other: "Other",
};

/** Restrict account after this many unique reports (any reason). */
export const AUTO_RESTRICT_AFTER_REPORTS = 3;

/** High-severity reasons restrict sooner. */
export const HIGH_SEVERITY_AUTO_RESTRICT_AFTER = 2;

export function isHighSeverityReportReason(reason: string): boolean {
  return reportPriorityForReason(reason) === "high";
}
