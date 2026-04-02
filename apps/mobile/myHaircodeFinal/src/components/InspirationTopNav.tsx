import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CaretLeft } from "phosphor-react-native";
import { router } from "expo-router";
import { primaryBlack } from "@/src/constants/Colors";
import { Typography } from "@/src/constants/Typography";
import { responsiveScale } from "@/src/utils/responsive";

type TopNavProps = {
  title: string;
  showSaveButton?: boolean;
  saveChanged?: boolean;
  saveAction?: () => void;
  titleStyle?: object;
  loading?: boolean;
  goHome?: () => void | undefined;
};

const InspirationTopNav = ({ title, goHome }: TopNavProps) => {
  return (
    <View style={styles.wrapper}>
      <Pressable
        style={styles.backRow}
        onPress={() => {
          if (goHome == undefined) {
            router.back();
          } else {
            goHome();
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <CaretLeft size={responsiveScale(26)} color={primaryBlack} weight="bold" />
        <Text style={styles.backLabel}>Back</Text>
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
    gap: responsiveScale(4),
    alignSelf: "flex-start",
    paddingVertical: responsiveScale(4),
  },
  backLabel: {
    fontFamily: "Inter-Medium",
    fontSize: responsiveScale(16),
    color: primaryBlack,
  },
  titleCentered: {
    textAlign: "center",
    width: "100%",
    marginTop: responsiveScale(20),
  },
});
