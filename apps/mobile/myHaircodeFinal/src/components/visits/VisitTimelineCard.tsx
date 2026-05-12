import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CaretRight } from "phosphor-react-native";
import { AvatarWithSpinner } from "@/src/components/avatarSpinner";
import { primaryBlack, primaryWhite } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveScale,
  responsivePadding,
  responsiveMargin,
} from "@/src/utils/responsive";

/** Pro / client row avatar — matches “View all visits” (`see_visits`). */
export const VISIT_TIMELINE_AVATAR_SIZE = responsiveScale(64);

export type VisitTimelineCardProps = {
  avatarUri?: string | null;
  dateLine: string;
  /** Second line (client name, or “Professional, Salon”, etc.). */
  subtitleLine: string;
  onPress: () => void;
  onPressIn?: () => void;
};

/** White bordered row with avatar, date (Anton 16), subtitle (Outfit), chevron — matches `see_visits` (“View all visits”). */
export const VisitTimelineCard = React.memo(function VisitTimelineCard({
  avatarUri,
  dateLine,
  subtitleLine,
  onPress,
  onPressIn,
}: VisitTimelineCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.visitCard,
        pressed && styles.visitCardPressed,
      ]}
      onPress={onPress}
      onPressIn={onPressIn}
      accessibilityRole="button"
    >
      <View style={styles.thumbWrap}>
        <AvatarWithSpinner
          uri={avatarUri}
          size={VISIT_TIMELINE_AVATAR_SIZE}
          style={styles.avatar}
        />
      </View>
      <View style={styles.textCol}>
        <Text
          style={[Typography.anton16Medium, styles.dateLine]}
          numberOfLines={1}
        >
          {dateLine}
        </Text>
        <Text style={Typography.bodyMedium} numberOfLines={2}>
          {subtitleLine}
        </Text>
      </View>
      <CaretRight
        size={responsiveScale(22)}
        color={primaryBlack}
        style={styles.chevron}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  visitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: primaryWhite,
    borderRadius: responsiveScale(20),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: primaryBlack,
    minHeight: responsiveScale(108),
    paddingVertical: responsivePadding(20),
    paddingHorizontal: responsivePadding(18),
    marginBottom: responsiveMargin(14),
  },
  visitCardPressed: {
    opacity: 0.92,
  },
  thumbWrap: {
    marginRight: responsiveMargin(16),
  },
  avatar: {
    borderWidth: 1,
    borderColor: `${primaryBlack}33`,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  dateLine: {
    marginBottom: responsiveMargin(6),
  },
  chevron: {
    marginLeft: responsiveMargin(8),
  },
});
