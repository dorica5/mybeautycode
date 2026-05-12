import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Typography } from "@/src/constants/Typography";
import { responsiveScale } from "@/src/utils/responsive";
import { NavBackRow } from "@/src/components/NavBackRow";

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
      <NavBackRow
        accessibilityLabel="Go back"
        onPress={() => {
          if (onBack) {
            onBack();
            return;
          }
          if (goHome === undefined) {
            router.back();
          } else {
            goHome?.();
          }
        }}
        hitSlop={12}
      />
      <Text style={[Typography.h3, styles.titleCentered]}>{title}</Text>
    </View>
  );
};

export default InspirationTopNav;

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  titleCentered: {
    textAlign: "center",
    width: "100%",
    marginTop: responsiveScale(20),
  },
});
