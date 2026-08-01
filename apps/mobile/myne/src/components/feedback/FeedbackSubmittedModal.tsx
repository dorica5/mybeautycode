import React from "react";
import { Text, StyleSheet } from "react-native";
import { Typography } from "@/src/constants/Typography";
import {
  MintBrandModal,
  MintBrandModalPrimaryButton,
} from "@/src/components/MintBrandModal";
import type { FeedbackItemType } from "@/src/api/feedback";
import { useI18n } from "@/src/providers/LanguageProvider";

type Props = {
  visible: boolean;
  submittedType: FeedbackItemType;
  onDismiss: () => void;
};

export function FeedbackSubmittedModal({
  visible,
  submittedType,
  onDismiss,
}: Props) {
  const { t } = useI18n();

  const titleKey = `feedback.thanksTitle.${submittedType}` as const;
  const messageKey = `feedback.thanksMessage.${submittedType}` as const;

  return (
    <MintBrandModal
      visible={visible}
      variant="compact"
      onClose={onDismiss}
      title={t(titleKey)}
      message={
        <Text style={[Typography.bodyMedium, styles.messageText]}>
          {t(messageKey)}
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

const styles = StyleSheet.create({
  messageText: {
    textAlign: "center",
    opacity: 0.92,
  },
});
