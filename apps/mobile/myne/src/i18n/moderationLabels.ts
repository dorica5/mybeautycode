import type { ReportReason } from "@/src/api/moderation";

export type I18nTranslate = (
  key: string,
  params?: Record<string, string | number>
) => string;

export function reportReasonLabel(
  t: I18nTranslate,
  value: ReportReason
): string {
  return t(`moderation.reportReasons.${value}`);
}
