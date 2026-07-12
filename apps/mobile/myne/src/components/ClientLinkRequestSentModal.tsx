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
  clientName?: string | null;
};

/**
 * Shown after a professional sends a client link request — mint / organic brand treatment.
 */
export function ClientLinkRequestSentModal({
  visible,
  onClose,
  clientName,
}: Props) {
  const { t } = useI18n();
  const trimmedName =
    typeof clientName === "string" && clientName.trim()
      ? clientName.trim()
      : null;

  const message = (
    <Text style={[Typography.bodyMedium, styles.messageText]}>
      {trimmedName
        ? t("home.clientLinkSentMessage", { name: trimmedName })
        : t("home.clientLinkSentMessageNoName")}
    </Text>
  );

  return (
    <MintBrandModal
      visible={visible}
      onClose={onClose}
      title={t("home.clientLinkSentTitle")}
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
  nameEmphasis: {
    fontWeight: "500",
  },
});
