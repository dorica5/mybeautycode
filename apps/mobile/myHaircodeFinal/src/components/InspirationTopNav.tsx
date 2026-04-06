import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CaretLeft } from "phosphor-react-native";
import { router } from "expo-router";
import { primaryBlack } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import {
  responsiveMargin,
  responsivePadding,
  responsiveScale,
} from "@/src/utils/responsive";

type TopNavProps = {
  title: string;
  showSaveButton?: boolean;
  saveChanged?: boolean;
  saveAction?: () => void;
  titleStyle?: object;
  loading?: boolean;
  goHome?: () => void | undefined;
  /** When set, runs instead of `goHome` / `router.back()` (e.g. close a modal). */
  onBack?: () => void;
};

const InspirationTopNav = ({ title, goHome, onBack }: TopNavProps) => {
  return (
    <View style={styles.wrapper}>
      <Pressable
        style={styles.backRow}
        onPress={() => {
          if (onBack) {
            onBack();
            return;
          }
          if (goHome == undefined) {
            router.back();
          } else {
            goHome();
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
      >
        <CaretLeft size={responsiveScale(28)} color={primaryBlack} />
        <Text style={[Typography.bodyMedium, styles.backText]}>Back</Text>
      </Pressable>
      <Text style={[Typography.h3, styles.titleCentered]}>{title}</Text>
    </View>
  );
};

export default InspirationTopNav;

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: responsivePadding(8),
    paddingVertical: responsiveMargin(8),
    gap: responsiveMargin(4),
  },
  backText: {
    color: primaryBlack,
  },
  titleCentered: {
    textAlign: "center",
    width: "100%",
    marginTop: responsiveScale(20),
  },
});
