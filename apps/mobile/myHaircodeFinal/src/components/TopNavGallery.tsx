import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { NavBackRow } from "@/src/components/NavBackRow";
import {
  responsiveScale,
  responsivePadding,
  responsiveFontSize,
} from "@/src/utils/responsive";

type TopNavGalleryProps = {
  title: string;
  secondTitle: string;
  titleStyle?: object;
};

const TopNavGallery = ({
  title,
  secondTitle,
  titleStyle,
}: TopNavGalleryProps) => {
  return (
    <View style={styles.topNav}>
      <NavBackRow
        layout="inlineBar"
        accessibilityLabel="Go back"
        hitSlop={12}
      />
      <View style={styles.titleAbsolute} pointerEvents="none">
        <View style={styles.titleBlock}>
          <Text
            style={[styles.title, titleStyle]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {secondTitle ? (
            <Text style={styles.secondTitle} numberOfLines={1}>
              {secondTitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default TopNavGallery;

const styles = StyleSheet.create({
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: responsivePadding(16),
    paddingHorizontal: responsivePadding(20),
    position: "relative",
    minHeight: responsiveScale(44),
  },
  /** Keeps titles visually centered while the real Back control is caret + label on the left. */
  titleAbsolute: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    alignItems: "center",
    paddingHorizontal: responsivePadding(8),
    maxWidth: "72%",
  },
  title: {
    fontSize: responsiveFontSize(22, 14),
    fontFamily: "Inter-SemiBold",
    color: "#212427",
    textAlign: "center",
  },
  secondTitle: {
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(15, 13),
    color: "#212427",
    opacity: 0.75,
    textAlign: "center",
    marginTop: responsivePadding(4),
  },
  number: {
    fontFamily: "Inter-Regular",
    fontSize: responsiveFontSize(16, 14),
    textAlign: "center",
  },
});
