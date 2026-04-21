import React from "react";
import { Text, StyleSheet } from "react-native";
import { Typography } from "@/src/constants/Typography";
import {
  MintBrandModal,
  MintBrandModalPrimaryButton,
} from "@/src/components/MintBrandModal";

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
  const trimmedName =
    typeof clientName === "string" && clientName.trim()
      ? clientName.trim()
      : null;

  const message = (
    <Text style={[Typography.bodyMedium, styles.messageText]}>
      {trimmedName ? (
        <>
          You{"'"}ve added{" "}
          <Text style={styles.nameEmphasis}>{trimmedName}</Text> as a client.
          They need to approve your request.
        </>
      ) : (
        <>
          You{"'"}ve added them as a client. They need to approve your request.
        </>
      )}
    </Text>
  );

  return (
    <MintBrandModal
      visible={visible}
      onClose={onClose}
      title="Client added"
      message={message}
      footer={
        <MintBrandModalPrimaryButton label="Got it" onPress={onClose} />
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
