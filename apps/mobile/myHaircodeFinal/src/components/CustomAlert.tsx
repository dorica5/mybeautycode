import React from "react";
import { MintBrandModal, MintBrandModalFooterRow, MintBrandModalPrimaryButton, MintBrandModalSecondaryButton } from "@/src/components/MintBrandModal";

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  fromDelete?: boolean;
  onDelete?: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onClose,
  fromDelete,
  onDelete,
}) => {
  return (
    <MintBrandModal
      visible={visible}
      onClose={onClose}
      title={title}
      message={message}
      footer={
        fromDelete ? (
          <MintBrandModalFooterRow>
            <MintBrandModalSecondaryButton label="Cancel" onPress={onClose} />
            <MintBrandModalPrimaryButton
              label="Delete"
              onPress={() => onDelete?.()}
            />
          </MintBrandModalFooterRow>
        ) : (
          <MintBrandModalPrimaryButton label="Got it" onPress={onClose} />
        )
      }
    />
  );
};

export default CustomAlert;