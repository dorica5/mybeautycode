import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CaretLeft } from "phosphor-react-native";
import { router } from "expo-router";
import { primaryBlack } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

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
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backPressable}
        >
          <CaretLeft size={responsiveScale(32)} color={primaryBlack} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: responsivePadding(20),
    paddingTop: responsivePadding(8),
    paddingBottom: responsivePadding(4),
  },
  backPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsivePadding(4),
  },
  backLabel: {
    ...Typography.bodySmall,
    color: primaryBlack,
  },
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
