import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ProSubscriberStarBadge } from "@/src/components/ProSubscriberStarBadge";
import { primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveBorderRadius,
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

/** Star + note row — matches the marketing site subscriber badge. */
export function ProSubscriberStarBadgeNote({ text }: { text: string }) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <ProSubscriberStarBadge size={28} />
      <Text style={[Typography.bodySmall, styles.text]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: responsiveMargin(10),
    maxWidth: responsiveScale(340),
    marginTop: responsiveMargin(12),
    paddingVertical: responsivePadding(10),
    paddingHorizontal: responsivePadding(14),
    borderRadius: responsiveBorderRadius(999),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: `${primaryBlack}22`,
    backgroundColor: `${primaryWhite}99`,
  },
  text: {
    flex: 1,
    color: `${primaryBlack}cc`,
    lineHeight: responsiveScale(20),
  },
});
