import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Typography } from "@/src/constants/Typography";
import { responsiveMargin, responsivePadding, responsiveScale } from "@/src/utils/responsive";
import {
  NavBackRow,
  navBackChromeBarCombined,
} from "@/src/components/NavBackRow";

type VisitRecordScreenHeaderProps = {
  title: string;
  /** e.g. `Tlf: …` — omit when empty */
  subtitle?: string;
  /** e.g. overflow menu aligned to the top row */
  rightSlot?: React.ReactNode;
};

/**
 * Visit detail top area: back is alone on the first row; client name and phone
 * sit lower as a separate block (not a combined top nav bar).
 */
export function VisitRecordScreenHeader({
  title,
  subtitle,
  rightSlot,
}: VisitRecordScreenHeaderProps) {
  return (
    <View>
      <View style={navBackChromeBarCombined()}>
        <NavBackRow layout="inlineBar" onPress={() => router.back()} />
        {rightSlot ? (
          rightSlot
        ) : (
          <View style={styles.topRowTrailPlaceholder} />
        )}
      </View>

      <View style={styles.titleBlock}>
        <Text style={[Typography.h3, styles.titleText]} numberOfLines={3}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[Typography.bodyMedium, styles.subtitleText]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRowTrailPlaceholder: {
    minWidth: responsiveScale(40),
  },
  titleBlock: {
    marginTop: responsiveMargin(32),
    paddingHorizontal: responsivePadding(20),
    alignItems: "center",
  },
  titleText: {
    textAlign: "center",
  },
  subtitleText: {
    textAlign: "center",
    marginTop: responsiveMargin(8),
  },
});
