import { Pressable, StyleSheet, Text, View } from "react-native";
import { CaretRight } from "phosphor-react-native";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import {
  primaryBlack,
  primaryWhite,
  secondaryGreen,
} from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

/** Muted destructive accent — readable on mint/white, not harsh red. */
export const moderationDestructive = "#6B4346";

export const moderationDetailCopy = {
  removeClient: {
    title: "Remove this client?",
    subtitle:
      "They will no longer appear in your list. You can send a new link request later if you change your mind.",
  },
  removeProfessional: {
    title: "Remove this professional?",
    subtitle:
      "They will be removed from your professionals. You can add them again later if you change your mind.",
  },
  block: {
    title: "Block this account",
    subtitle: `They won't be able to reach you through ${BRAND_DISPLAY_NAME}. Blocking ends your active client link. If you unblock later, you will need to add or request a connection again to work together.`,
  },
  report: {
    title: `Report to ${BRAND_DISPLAY_NAME}`,
    subtitle:
      "Our team reviews every report. Details you provide stay private to you and moderators.",
  },
} as const;

const hairline = StyleSheet.hairlineWidth;

type HeadingProps = {
  title: string;
  subtitle?: string;
};

export function ModerationSheetHeading({ title, subtitle }: HeadingProps) {
  return (
    <View style={headingStyles.wrap}>
      <Text style={headingStyles.title}>{title}</Text>
      {subtitle ? (
        <Text style={headingStyles.subtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const headingStyles = StyleSheet.create({
  wrap: {
    marginBottom: responsiveMargin(20),
    paddingHorizontal: responsivePadding(4),
  },
  title: {
    ...Typography.agLabel16,
    color: primaryBlack,
    textAlign: "center",
  },
  subtitle: {
    ...Typography.bodySmall,
    color: primaryBlack,
    opacity: 0.62,
    textAlign: "center",
    marginTop: responsiveMargin(8),
    lineHeight: responsiveScale(22),
  },
});

type ReasonRowProps = {
  label: string;
  onPress: () => void;
  /** Visually emphasize (e.g. confirm remove). */
  danger?: boolean;
  disabled?: boolean;
};

export function ModerationReasonRow({
  label,
  onPress,
  danger,
  disabled,
}: ReasonRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        reasonStyles.row,
        pressed && !disabled && reasonStyles.rowPressed,
        danger && reasonStyles.rowDanger,
        disabled && reasonStyles.rowDisabled,
      ]}
    >
      <Text
        style={[
          Typography.bodyMedium,
          reasonStyles.label,
          danger && { color: moderationDestructive },
        ]}
      >
        {label}
      </Text>
      <CaretRight
        size={responsiveScale(18)}
        color={primaryBlack}
        style={reasonStyles.chevron}
        weight="bold"
      />
    </Pressable>
  );
}

const reasonStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: responsivePadding(16, 14),
    paddingHorizontal: responsivePadding(18, 16),
    marginBottom: responsiveMargin(10),
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(14),
    borderWidth: hairline,
    borderColor: `${primaryBlack}18`,
  },
  rowPressed: {
    backgroundColor: secondaryGreen,
  },
  rowDanger: {
    borderColor: `${moderationDestructive}40`,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  label: {
    color: primaryBlack,
    flex: 1,
    marginRight: responsiveMargin(12),
  },
  chevron: {
    opacity: 0.4,
  },
});
