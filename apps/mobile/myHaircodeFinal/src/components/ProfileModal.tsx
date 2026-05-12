import { StyleSheet, Text, Pressable, View } from "react-native";
import React from "react";
import type { IconProps } from "phosphor-react-native";
import { Typography } from "@/src/constants/Typography";
import {
  primaryBlack,
  primaryWhite,
  secondaryGreen,
} from "@/src/constants/Colors";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
} from "@/src/utils/responsive";
import { moderationDestructive } from "@/src/components/moderation/ModerationSheetParts";

type ProfileModalProps = {
  title: string;
  Icon: React.ComponentType<IconProps>;
  /** Delete / destructive row — matches safety sheet styling */
  destructive?: boolean;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

/**
 * Action row for mint bottom sheets — layout matches {@link RapportUserModal}
 * and {@link ModerationReasonRow} / moderation sheets.
 */
const ProfileModal = ({
  title,
  Icon,
  destructive = false,
  style,
  ...pressableProps
}: ProfileModalProps) => {
  const iconColor = destructive ? moderationDestructive : primaryBlack;
  const iconSize = responsiveScale(22);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        destructive && styles.rowDestructive,
        pressed && styles.rowPressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      {...pressableProps}
    >
      <View style={styles.rowInner}>
        <Icon size={iconSize} color={iconColor} weight="regular" />
        <Text
          style={[
            Typography.bodyMedium,
            styles.label,
            destructive && styles.labelDestructive,
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
};

export default ProfileModal;

const hairline = StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  row: {
    marginBottom: responsiveMargin(10),
    paddingVertical: responsivePadding(16, 14),
    paddingHorizontal: responsivePadding(18, 16),
    borderRadius: responsiveScale(14),
    backgroundColor: primaryWhite,
    borderWidth: hairline,
    borderColor: `${primaryBlack}18`,
    alignSelf: "stretch",
  },
  rowDestructive: {
    borderColor: `${moderationDestructive}35`,
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
    flexShrink: 1,
  },
  labelDestructive: {
    color: moderationDestructive,
  },
});
