import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  REPORT_REASONS,
  type ReportReason,
  reportUserEnhanced,
} from "@/src/api/moderation";
import { reportReasonLabel } from "@/src/i18n/moderationLabels";
import { useI18n } from "@/src/providers/LanguageProvider";
import {
  ModerationReasonRow,
  reportOtherReasonRowStyle,
} from "@/src/components/moderation/ModerationSheetParts";
import { MintBrandModalPrimaryButton } from "@/src/components/MintBrandModal";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import { primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

const MAX_DETAILS = 500;

type ReportReasonPickerProps = {
  reporterId: string;
  reportedId: string;
  professionCode: string | null | undefined;
  context?: string;
  onDone: () => void;
};

export function ReportReasonPicker({
  reporterId,
  reportedId,
  professionCode,
  context,
  onDone,
}: ReportReasonPickerProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"reason" | "details">("reason");
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(
    null
  );
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const finishWithAlerts = async (reason: ReportReason, extra?: string) => {
    setSubmitting(true);
    try {
      const result = await reportUserEnhanced(reporterId, reportedId, reason, {
        additionalDetails: extra?.trim() || undefined,
        professionCode,
        context,
        queryClient,
      });

      if (result.autoBlocked) {
        Alert.alert(
          t("moderation.reportReceived"),
          t("moderation.reportAutoBlocked")
        );
      } else if (result.blockedForReporter) {
        Alert.alert(
          t("moderation.reportReceived"),
          t("moderation.reportSuccessWithBlock", { brand: BRAND_DISPLAY_NAME })
        );
      } else {
        Alert.alert(
          t("moderation.reportReceived"),
          t("moderation.reportSuccess")
        );
      }
      onDone();
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message === "You have already reported this user"
      ) {
        Alert.alert(
          t("moderation.alreadyReported"),
          t("moderation.alreadyReportedMessage")
        );
        onDone();
      } else {
        console.error("Error reporting user:", error);
        Alert.alert(t("common.error"), t("moderation.reportUserFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pickReason = (reason: ReportReason) => {
    setSelectedReason(reason);
    setStep("details");
  };

  const submitDetails = async () => {
    if (!selectedReason) return;
    const trimmed = details.trim();
    if (selectedReason === "other" && trimmed.length < 8) {
      Alert.alert(
        t("moderation.reportDetailsRequiredTitle"),
        t("moderation.reportDetailsRequiredMessage")
      );
      return;
    }
    await finishWithAlerts(selectedReason, trimmed || undefined);
  };

  if (step === "reason") {
    return (
      <>
        {REPORT_REASONS.map((reason) => (
          <ModerationReasonRow
            key={reason.value}
            label={reportReasonLabel(t, reason.value)}
            style={
              reason.value === "other" ? reportOtherReasonRowStyle : undefined
            }
            onPress={() => pickReason(reason.value)}
          />
        ))}
      </>
    );
  }

  return (
    <View style={styles.detailsWrap}>
      <Text style={styles.selectedReason}>
        {selectedReason ? reportReasonLabel(t, selectedReason) : ""}
      </Text>
      <Text style={styles.detailsHint}>
        {selectedReason === "other"
          ? t("moderation.reportDetailsRequiredHint")
          : t("moderation.reportDetailsOptionalHint")}
      </Text>
      <TextInput
        style={styles.detailsInput}
        value={details}
        onChangeText={setDetails}
        placeholder={t("moderation.reportDetailsPlaceholder")}
        placeholderTextColor={`${primaryBlack}55`}
        multiline
        maxLength={MAX_DETAILS}
        editable={!submitting}
        textAlignVertical="top"
      />
      <View style={styles.actions}>
        <MintBrandModalPrimaryButton
          label={
            submitting ? t("inspiration.pleaseWait") : t("moderation.submitReport")
          }
          onPress={() => void submitDetails()}
          disabled={submitting}
          accessibilityLabel={t("moderation.submitReport")}
        />
        <Text
          style={styles.backLink}
          onPress={() => {
            if (submitting) return;
            setStep("reason");
          }}
          accessibilityRole="button"
        >
          {t("moderation.chooseDifferentReason")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailsWrap: {
    paddingBottom: responsiveMargin(8),
  },
  selectedReason: {
    ...Typography.bodyMedium,
    color: primaryBlack,
    textAlign: "center",
    marginBottom: responsiveMargin(8),
  },
  detailsHint: {
    ...Typography.bodySmall,
    color: primaryBlack,
    opacity: 0.65,
    textAlign: "center",
    marginBottom: responsiveMargin(14),
    lineHeight: responsiveScale(20),
  },
  detailsInput: {
    minHeight: responsiveScale(100),
    maxHeight: responsiveScale(160),
    backgroundColor: primaryWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${primaryBlack}22`,
    borderRadius: responsiveScale(14),
    paddingHorizontal: responsivePadding(16),
    paddingVertical: responsivePadding(12),
    ...Typography.bodyMedium,
    color: primaryBlack,
    marginBottom: responsiveMargin(16),
  },
  actions: {
    gap: responsiveMargin(12),
    alignItems: "center",
  },
  backLink: {
    ...Typography.bodySmall,
    color: primaryBlack,
    opacity: 0.72,
    textDecorationLine: "underline",
    paddingVertical: responsivePadding(8),
  },
});
