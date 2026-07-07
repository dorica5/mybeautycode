import React from "react";
import { Text, StyleSheet } from "react-native";
import { Typography } from "@/src/constants/Typography";
import {
  MintBrandModal,
  MintBrandModalPrimaryButton,
} from "@/src/components/MintBrandModal";
import { useI18n } from "@/src/providers/LanguageProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Mint confirmation after a successful unblock (replaces native Alert). */
export function UnblockSuccessModal({ visible, onClose }: Props) {
  const { t } = useI18n();

  const message = (
    <Text style={[Typography.bodyMedium, styles.messageText]}>
      {t("moderation.unblockSuccessMessage")}
    </Text>
  );

  return (
    <MintBrandModal
      visible={visible}
      onClose={onClose}
      title={t("moderation.unblockSuccessTitle")}
      message={message}
      footer={
        <MintBrandModalPrimaryButton label={t("common.gotIt")} onPress={onClose} />
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
