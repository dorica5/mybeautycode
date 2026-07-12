import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { CaretRight } from "phosphor-react-native";
import { BRAND_DISPLAY_NAME } from "@/src/constants/brand";
import { useI18n } from "@/src/providers/LanguageProvider";
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

export type ModerationDetailCopy = {
  title: string;
  subtitle: string;
};

export function useModerationDetailCopy(): {
  removeClient: ModerationDetailCopy;
  removeProfessional: ModerationDetailCopy;
  block: ModerationDetailCopy;
  report: ModerationDetailCopy;
} {
  const { t } = useI18n();
  return {
    removeClient: {
      title: t("moderation.removeClientTitle"),
      subtitle: t("moderation.removeClientSubtitle"),
    },
    removeProfessional: {
      title: t("moderation.removeProfessionalTitle"),
      subtitle: t("moderation.removeProfessionalSubtitle"),
    },
    block: {
      title: t("moderation.blockTitle"),
      subtitle: t("moderation.blockSubtitle", { brand: BRAND_DISPLAY_NAME }),
    },
    report: {
      title: t("moderation.reportTitle", { brand: BRAND_DISPLAY_NAME }),
      subtitle: t("moderation.reportSubtitle"),
    },
  };
}

/**
 * Extra space under the last report reason ("Other").
 * Use `paddingBottom` on the wrapper `View` (not `marginBottom`): margins on the last
 * child in `ScrollView` — especially inside sheets — are often clipped or omitted from
 * content size on iOS; padding is always laid out. `collapsable={false}` on the wrapper
 * avoids Android collapsing that view away.
 */
export const reportOtherReasonRowStyle: ViewStyle = {
  paddingBottom: responsiveMargin(32, 44),
};

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
  /**
   * Outer wrapper styles (e.g. bottom margin on last report reason). Prefer this over
   * putting margin on the row `Pressable` so spacing is measured correctly in scroll views.
   */
  style?: StyleProp<ViewStyle>;
};

export function ModerationReasonRow({
  label,
  onPress,
  danger,
  disabled,
  style,
}: ReasonRowProps) {
  const row = (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        reasonStyles.row,
        style && reasonStyles.rowFlushBottom,
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

  if (style) {
    return (
      <View style={style} collapsable={false}>
        {row}
      </View>
    );
  }
  return row;
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
  /** When a wrapper owns bottom spacing, keep default row gap off the pressable. */
  rowFlushBottom: {
    marginBottom: 0,
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
