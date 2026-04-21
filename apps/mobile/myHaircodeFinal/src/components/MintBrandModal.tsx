import React, { useMemo } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Text,
  useWindowDimensions,
  type ReactNode,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import OrganicPattern from "../../assets/images/Organic-pattern-5.svg";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

export type MintBrandModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  footer: ReactNode;
  /** When true, tapping the dimmed area calls `onClose` (e.g. cancel). Default true. */
  closeOnBackdropPress?: boolean;
};

/**
 * Centered mint card + organic strip — shared shell for post-add client, delete inspiration, etc.
 */
export function MintBrandModal({
  visible,
  onClose,
  title,
  message,
  footer,
  closeOnBackdropPress = true,
}: MintBrandModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const cardWidth = useMemo(
    () => Math.min(responsiveScale(360), windowWidth - responsivePadding(40)),
    [windowWidth]
  );

  const heroHeight = Math.round((cardWidth / 1.77) * 0.42);
  const heroNudge = heroHeight * 0.34;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <Pressable
        style={styles.backdrop}
        onPress={closeOnBackdropPress ? onClose : undefined}
        accessibilityRole={closeOnBackdropPress ? "button" : undefined}
        accessibilityLabel={closeOnBackdropPress ? "Close dialog" : undefined}
      >
        <Pressable
          style={[styles.card, { width: cardWidth }]}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
        >
          <View style={[styles.heroClip, { height: heroHeight }]}>
            <OrganicPattern
              width={cardWidth}
              height={heroHeight}
              preserveAspectRatio="xMidYMid slice"
              style={{ transform: [{ translateY: -heroNudge }] }}
            />
          </View>

          <View style={styles.body}>
            <Text style={[Typography.h3, styles.title]} accessibilityRole="header">
              {title}
            </Text>
            {typeof message === "string" ? (
              <Text style={[Typography.bodyMedium, styles.message]}>{message}</Text>
            ) : (
              <View style={styles.messageWrap}>{message}</View>
            )}
            {footer}
          </View>

          <View style={{ height: Math.max(insets.bottom, responsiveMargin(12)) }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function MintBrandModalPrimaryButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.primaryPill, pressed && { opacity: 0.88 }]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={styles.primaryPillLabel}>{label}</Text>
    </Pressable>
  );
}

export function MintBrandModalSecondaryButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryPill, pressed && { opacity: 0.88 }]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={styles.secondaryPillLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsivePadding(20),
  },
  card: {
    backgroundColor: primaryGreen,
    borderRadius: responsiveScale(28),
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${primaryBlack}33`,
  },
  heroClip: {
    width: "100%",
    backgroundColor: primaryGreen,
    overflow: "hidden",
  },
  body: {
    paddingHorizontal: responsivePadding(24),
    paddingTop: responsiveMargin(22),
    paddingBottom: responsiveMargin(8),
    alignItems: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: responsiveMargin(14),
    alignSelf: "stretch",
  },
  message: {
    textAlign: "center",
    marginBottom: responsiveMargin(24),
    alignSelf: "stretch",
    opacity: 0.92,
  },
  messageWrap: {
    marginBottom: responsiveMargin(24),
    alignSelf: "stretch",
    alignItems: "center",
    opacity: 0.92,
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: responsiveMargin(12),
    alignSelf: "stretch",
  },
  primaryPill: {
    minWidth: responsiveScale(132),
    paddingVertical: responsivePadding(14),
    paddingHorizontal: responsivePadding(24),
    borderRadius: responsiveScale(999),
    backgroundColor: primaryBlack,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryPillLabel: {
    ...Typography.outfitRegular16,
    color: primaryWhite,
    textAlign: "center",
  },
  secondaryPill: {
    minWidth: responsiveScale(132),
    paddingVertical: responsivePadding(14),
    paddingHorizontal: responsivePadding(24),
    borderRadius: responsiveScale(999),
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: primaryBlack,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryPillLabel: {
    ...Typography.outfitRegular16,
    color: primaryBlack,
    textAlign: "center",
  },
});

export function MintBrandModalFooterRow({ children }: { children: ReactNode }) {
  return <View style={styles.footerRow}>{children}</View>;
}
