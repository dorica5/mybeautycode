import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import PinXMarkStreamline from "../../assets/icons/pin_x_mark_streamline.svg";
import { primaryBlack, primaryGreen, primaryWhite } from "@/src/constants/Colors";
import { responsiveScale } from "@/src/utils/responsive";

const BUBBLE = responsiveScale(46);
const ICON = responsiveScale(28);

/**
 * Custom map pin: mint circle, black stroke, Streamline-style map pin (hole + teardrop, no X).
 * `selected`: black fill + white icon (matches map selection state).
 * Use inside `<Marker anchor={{ x: 0.5, y: 0.5 }}>...</Marker>`.
 */
export function ProfessionalMapPinBubble({
  selected = false,
}: {
  selected?: boolean;
}) {
  return (
    <View
      style={[styles.bubble, selected && styles.bubbleSelected]}
      collapsable={false}
    >
      <PinXMarkStreamline
        width={ICON}
        height={ICON}
        color={selected ? primaryWhite : primaryBlack}
      />
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
      android: {
        elevation: 5,
      },
      default: {},
    }),
  },
  bubbleSelected: {
    backgroundColor: primaryBlack,
    borderColor: primaryBlack,
  },
});
