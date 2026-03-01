import { Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";
import { CaretLeft } from "phosphor-react-native";
import { router } from "expo-router";
import { Colors } from "../constants/Colors";

type SetUpNavProps = {
  title: string;
};

const SetUpNav = ({ title }: SetUpNavProps) => {
  return (
    <View style={styles.topNav}>
      <Pressable onPress={() => router.back()} style={styles.iconContainer}>
        <CaretLeft size={32} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.iconPlaceholder} />
      {/* Placeholder to keep the title centered */}
    </View>
  );
};

export default SetUpNav;

const styles = StyleSheet.create({
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Center the content horizontally
    marginTop: "7%",
    marginLeft: "5%",
  },
  iconContainer: {
    position: "absolute",
    left: 0,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter-SemiBold",
    color: Colors.dark.dark,
    textAlign: "center",
  },
  iconPlaceholder: {
    width: 32, // Width of the icon to maintain the spacing
  },
});
