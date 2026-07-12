import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Typography } from "@/src/constants/Typography";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { responsiveScale } from "@/src/utils/responsive";

const BUBBLE = responsiveScale(46);

type Props = {
  count: number;
  selected?: boolean;
};

/**
 * Mint circle with cluster count (AG Label 16) for zoomed-out map view.
 */
export function ClusterMapBubble({ count, selected = false }: Props) {
  return (
    <View
      style={[styles.bubble, selected && styles.bubbleSelected]}
      collapsable={false}
    >
      <Text
        style={[Typography.agLabel16, styles.count, selected && styles.countSelected]}
        numberOfLines={1}
      >
        {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    backgroundColor: primaryGreen,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: responsiveScale(2) },
        shadowOpacity: 0.22,
        shadowRadius: responsiveScale(3),
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  bubbleSelected: {
    backgroundColor: primaryBlack,
    borderColor: primaryBlack,
  },
  count: {
    color: primaryBlack,
    textAlign: "center",
    includeFontPadding: false,
    maxWidth: BUBBLE - responsiveScale(8),
  },
  countSelected: {
    color: primaryWhite,
  },
});
