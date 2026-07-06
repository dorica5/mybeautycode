import React from "react";
import { Text, StyleSheet } from "react-native";
import { Typography } from "@/src/constants/Typography";
import {
  MintBrandModal,
  MintBrandModalFooterRow,
  MintBrandModalPrimaryButton,
  MintBrandModalSecondaryButton,
} from "@/src/components/MintBrandModal";
import { useI18n } from "@/src/providers/LanguageProvider";

export type VisitSaveFeedbackKind =
  | { type: "success"; mode: "create" | "edit" }
  | { type: "error"; message: string }
  | { type: "limit"; limit: number };

type Props = {
  feedback: VisitSaveFeedbackKind | null;
  onDismiss: () => void;
  onSubscribe: () => void;
};

/**
 * Branded feedback after saving a visit — success, generic failure, or visit limit.
 */
export function VisitSaveFeedbackModal({
  feedback,
  onDismiss,
  onSubscribe,
}: Props) {
  const { t } = useI18n();

  if (!feedback) return null;

  if (feedback.type === "success") {
    const message =
      feedback.mode === "edit"
        ? t("visits.visitUpdatedSuccess")
        : t("visits.visitCreatedSuccess");

    return (
      <MintBrandModal
        visible
        variant="compact"
        onClose={onDismiss}
        title={t("visits.visitSavedTitle")}
        message={
          <Text style={[Typography.bodyMedium, styles.messageText]}>
            {message}
          </Text>
        }
        footer={
          <MintBrandModalPrimaryButton
            label={t("common.gotIt")}
            onPress={onDismiss}
          />
        }
      />
    );
  }

  if (feedback.type === "limit") {
    return (
      <MintBrandModal
        visible
        variant="compact"
        onClose={onDismiss}
        title={t("billing.limitReachedTitle")}
        message={t("billing.limitReachedCreate", {
          limit: String(feedback.limit),
        })}
        footer={
          <MintBrandModalFooterRow>
            <MintBrandModalSecondaryButton
              label={t("common.cancel")}
              onPress={onDismiss}
            />
            <MintBrandModalPrimaryButton
              label={t("billing.subscribeToContinue")}
              onPress={onSubscribe}
            />
          </MintBrandModalFooterRow>
        }
      />
    );
  }

  return (
    <MintBrandModal
      visible
      variant="compact"
      onClose={onDismiss}
      title={t("visits.visitSaveFailedTitle")}
      message={feedback.message}
      footer={
        <MintBrandModalPrimaryButton
          label={t("common.gotIt")}
          onPress={onDismiss}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  messageText: {
    textAlign: "center",
    opacity: 0.92,
  },
});
