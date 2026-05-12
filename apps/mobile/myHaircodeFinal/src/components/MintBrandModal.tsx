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
import {
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
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
  /**
   * Short copy + one action: tighter card, small pattern strip, body height follows content
   * (avoids a tall empty scroll area).
   */
  variant?: "default" | "compact";
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
  variant = "default",
}: MintBrandModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = variant === "compact";

  const cardWidth = useMemo(
    () =>
      Math.min(
        isCompact ? responsiveScale(300) : responsiveScale(360),
        windowWidth - responsivePadding(40)
      ),
    [windowWidth, isCompact]
  );

  const heroHeight = isCompact
    ? Math.round(Math.min(responsiveScale(44), cardWidth * 0.14))
    : Math.round((cardWidth / 1.77) * 0.42);
  const heroNudge = heroHeight * 0.34;

  /** Keep the card on-screen; body scrolls (e.g. long report reason lists on phone + iPad). */
  const maxCardHeight = useMemo(() => {
    const verticalPad = responsivePadding(24) * 2;
    return Math.max(
      280,
      windowHeight - insets.top - insets.bottom - verticalPad
    );
  }, [windowHeight, insets.top, insets.bottom]);

  /**
   * iPad: `maxCardHeight - hero` can be ~800pt while RN may still size the scroll pane to
   * content and clip without scroll. Cap to ~50% of the window so the list always overflows
   * inside a fixed viewport (pairs with RNGH ScrollView inside Modal).
   */
  const bodyScrollMaxHeight = useMemo(() => {
    const raw = Math.max(160, maxCardHeight - heroHeight);
    const capByWindow = windowHeight * 0.5;
    return Math.min(raw, capByWindow);
  }, [maxCardHeight, heroHeight, windowHeight]);

  const bodyInner = (
    <>
      <Text
        style={[
          Typography.h3,
          styles.title,
          isCompact && styles.titleCompact,
        ]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {typeof message === "string" ? (
        <Text
          style={[Typography.bodyMedium, styles.message, isCompact && styles.messageCompact]}
        >
          {message}
        </Text>
      ) : (
        <View style={[styles.messageWrap, isCompact && styles.messageWrapCompact]}>
          {message}
        </View>
      )}
      {footer}
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.backdrop} pointerEvents="box-none">
          <Pressable
            style={styles.backdropDim}
            onPress={closeOnBackdropPress ? onClose : undefined}
            accessibilityRole={closeOnBackdropPress ? "button" : undefined}
            accessibilityLabel={
              closeOnBackdropPress ? "Close dialog" : undefined
            }
          />
          <View
            style={[
              styles.card,
              { width: cardWidth, maxHeight: maxCardHeight, zIndex: 1 },
            ]}
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

            {isCompact ? (
              <View
                style={[
                  styles.bodyCompact,
                  {
                    paddingBottom:
                      responsiveMargin(16) +
                      Math.max(insets.bottom, responsiveMargin(8)),
                  },
                ]}
              >
                {bodyInner}
              </View>
            ) : (
              <ScrollView
                style={[styles.bodyScroll, { height: bodyScrollMaxHeight }]}
                contentContainerStyle={[
                  styles.bodyScrollContent,
                  {
                    paddingBottom:
                      responsiveMargin(24) +
                      Math.max(insets.bottom, responsiveMargin(12)),
                  },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                bounces
                overScrollMode="never"
                removeClippedSubviews={false}
              >
                {bodyInner}
              </ScrollView>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
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
  gestureRoot: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: responsivePadding(20),
  },
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
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
  bodyScroll: {
    alignSelf: "stretch",
  },
  bodyCompact: {
    alignSelf: "stretch",
    paddingHorizontal: responsivePadding(20),
    paddingTop: responsiveMargin(14),
    alignItems: "center",
  },
  bodyScrollContent: {
    paddingHorizontal: responsivePadding(24),
    paddingTop: responsiveMargin(22),
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
  messageCompact: {
    marginBottom: responsiveMargin(14),
  },
  messageWrap: {
    marginBottom: responsiveMargin(24),
    alignSelf: "stretch",
    alignItems: "center",
    opacity: 0.92,
  },
  messageWrapCompact: {
    marginBottom: responsiveMargin(14),
  },
  titleCompact: {
    marginBottom: responsiveMargin(10),
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    alignContent: "center",
    gap: responsiveMargin(12),
    alignSelf: "stretch",
    width: "100%",
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
    backgroundColor: primaryWhite,
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
