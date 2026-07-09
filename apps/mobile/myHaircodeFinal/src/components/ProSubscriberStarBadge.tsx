import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { Star } from "phosphor-react-native";
import { primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { responsiveScale } from "@/src/utils/responsive";

type ProSubscriberStarBadgeProps = {
  size?: number;
} & Pick<ViewProps, "accessibilityLabel">;

/** Filled star in a circle — matches the marketing site subscriber badge. */
export function ProSubscriberStarBadge({
  size = 22,
  accessibilityLabel,
}: ProSubscriberStarBadgeProps) {
  const circle = responsiveScale(size);
  const icon = responsiveScale(size * 0.55);

  return (
    <View
      style={[
        styles.circle,
        { width: circle, height: circle, borderRadius: circle / 2 },
      ]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      <Star size={icon} color={primaryBlack} weight="fill" />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: primaryWhite,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: `${primaryBlack}22`,
  },
});
