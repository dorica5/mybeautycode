import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { router } from "expo-router";
import { Colors } from "../constants/Colors";
import { NavBackRow } from "./NavBackRow";

type SetUpNavProps = {
  title: string;
};

const SetUpNav = ({ title }: SetUpNavProps) => {
  return (
    <View style={styles.topNav}>
      <View style={styles.backAbsolute}>
        <NavBackRow onPress={() => router.back()} accessibilityLabel="Go back" />
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

export default SetUpNav;

const styles = StyleSheet.create({
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "7%",
    marginLeft: "5%",
    marginRight: "5%",
  },
  backAbsolute: {
    position: "absolute",
    left: 0,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter-SemiBold",
    color: Colors.dark.dark,
    textAlign: "center",
  },
});
