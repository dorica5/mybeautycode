import React from "react";
import {
  MintBrandModal,
  MintBrandModalFooterRow,
  MintBrandModalPrimaryButton,
  MintBrandModalSecondaryButton,
} from "@/src/components/MintBrandModal";
import { useI18n } from "@/src/providers/LanguageProvider";

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  fromDelete?: boolean;
  onDelete?: () => void;
  /** Tighter card when copy is short (e.g. info tooltips). */
  compact?: boolean;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onClose,
  fromDelete,
  onDelete,
  compact,
}) => {
  const { t } = useI18n();

  return (
    <MintBrandModal
      visible={visible}
      onClose={onClose}
      title={title}
      message={message}
      variant={compact ? "compact" : "default"}
      footer={
        fromDelete ? (
          <MintBrandModalFooterRow>
            <MintBrandModalSecondaryButton
              label={t("common.cancel")}
              onPress={onClose}
            />
            <MintBrandModalPrimaryButton
              label={t("common.delete")}
              onPress={() => onDelete?.()}
            />
          </MintBrandModalFooterRow>
        ) : (
          <MintBrandModalPrimaryButton
            label={t("common.gotIt")}
            onPress={onClose}
          />
        )
      }
    />
  );
};

export default CustomAlert;
