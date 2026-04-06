import { StyleSheet, View, Pressable, Text } from "react-native";
import React from "react";
import { Flag, Prohibit, Trash, X } from "phosphor-react-native";
import {
  primaryBlack,
  primaryWhite,
  secondaryGreen,
} from "../constants/Colors";
import { Typography } from "../constants/Typography";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
} from "../utils/responsive";
import { moderationDestructive } from "./moderation/ModerationSheetParts";

type RapportUserProps = {
  bottom?: boolean;
  top?: boolean;
  title: string;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const MENU_LABELS: Record<string, string> = {
  Delete: "Remove client",
  Block: "Block user",
  Report: "Report",
  Cancel: "Cancel",
};

const RapportUserModal = ({
  title,
  ...pressableProps
}: RapportUserProps) => {
  const label = MENU_LABELS[title] ?? title;
  const isDelete = title === "Delete";
  const isCancel = title === "Cancel";

  const Icon = (() => {
    switch (title) {
      case "Delete":
        return Trash;
      case "Block":
        return Prohibit;
      case "Report":
        return Flag;
      default:
        return X;
    }
  })();

  const iconColor = isDelete ? moderationDestructive : primaryBlack;
  const iconSize = responsiveScale(22);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        isCancel && styles.rowCancel,
        isDelete && styles.rowDestructive,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...pressableProps}
    >
      <View style={styles.rowInner}>
        <Icon size={iconSize} color={iconColor} weight="regular" />
        <Text
          style={[
            Typography.bodyMedium,
            styles.label,
            isDelete && { color: moderationDestructive },
            isCancel && styles.labelCancel,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

export default RapportUserModal;

const styles = StyleSheet.create({
  row: {
    marginBottom: responsiveMargin(10),
    paddingVertical: responsivePadding(16, 14),
    paddingHorizontal: responsivePadding(18, 16),
    borderRadius: responsiveScale(14),
    backgroundColor: primaryWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${primaryBlack}18`,
  },
  rowDestructive: {
    borderColor: `${moderationDestructive}35`,
  },
  rowCancel: {
    backgroundColor: "transparent",
    borderColor: `${primaryBlack}24`,
  },
  rowPressed: {
    backgroundColor: secondaryGreen,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsiveScale(14),
  },
  label: {
    color: primaryBlack,
    flex: 1,
  },
  labelCancel: {
    opacity: 0.85,
  },
});
